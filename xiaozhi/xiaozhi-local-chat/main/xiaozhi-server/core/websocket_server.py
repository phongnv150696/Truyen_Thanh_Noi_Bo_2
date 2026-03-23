import asyncio
import logging

import websockets
from config.logger import setup_logging


class SuppressInvalidHandshakeFilter(logging.Filter):
    """Lọc bỏ log lỗi bắt tay không hợp lệ (như truy cập port WS bằng HTTPS)"""

    def filter(self, record):
        msg = record.getMessage()
        suppress_keywords = [
            "opening handshake failed",
            "did not receive a valid HTTP request",
            "connection closed while reading HTTP request",
            "line without CRLF",
        ]
        return not any(keyword in msg for keyword in suppress_keywords)


def _setup_websockets_logger():
    """Cấu hình tất cả logger liên quan đến websockets, lọc lỗi bắt tay không hợp lệ"""
    filter_instance = SuppressInvalidHandshakeFilter()
    for logger_name in ["websockets", "websockets.server", "websockets.client"]:
        logger = logging.getLogger(logger_name)
        logger.addFilter(filter_instance)


_setup_websockets_logger()


from core.connection import ConnectionHandler
from config.config_loader import get_config_from_api_async
from core.auth import AuthManager, AuthenticationError
from core.utils.modules_initialize import initialize_modules
from core.utils.util import check_vad_update, check_asr_update

TAG = __name__


class WebSocketServer:
    def __init__(self, config: dict):
        self.config = config
        self.logger = setup_logging()
        self.config_lock = asyncio.Lock()
        modules = initialize_modules(
            self.logger,
            self.config,
            "VAD" in self.config["selected_module"],
            "ASR" in self.config["selected_module"],
            "LLM" in self.config["selected_module"],
            False,
            "Memory" in self.config["selected_module"],
            "Intent" in self.config["selected_module"],
        )
        self._vad = modules["vad"] if "vad" in modules else None
        self._asr = modules["asr"] if "asr" in modules else None
        self._llm = modules["llm"] if "llm" in modules else None
        self._intent = modules["intent"] if "intent" in modules else None
        self._memory = modules["memory"] if "memory" in modules else None

        auth_config = self.config["server"].get("auth", {})
        self.auth_enable = auth_config.get("enabled", False)
        # Danh sách thiết bị cho phép (White list)
        self.allowed_devices = set(auth_config.get("allowed_devices", []))
        secret_key = self.config["server"]["auth_key"]
        expire_seconds = auth_config.get("expire_seconds", None)
        self.auth = AuthManager(secret_key=secret_key, expire_seconds=expire_seconds)

    async def start(self):
        server_config = self.config["server"]
        host = server_config.get("ip", "0.0.0.0")
        port = int(server_config.get("port", 8000))

        async with websockets.serve(
            self._handle_connection, host, port, process_request=self._http_response
        ):
            await asyncio.Future()

    async def _handle_connection(self, websocket):
        print(f"DEBUG: WebSocketServer._handle_connection called for {websocket.remote_address}", flush=True)
        headers = dict(websocket.request.headers)
        if headers.get("device-id", None) is None:
            # Thử lấy device-id từ tham số truy vấn URL
            from urllib.parse import parse_qs, urlparse

            # Lấy đường dẫn từ yêu cầu WebSocket
            request_path = websocket.request.path
            if not request_path:
                self.logger.bind(tag=TAG).error("Không thể lấy đường dẫn yêu cầu")
                await websocket.close()
                return
            parsed_url = urlparse(request_path)
            query_params = parse_qs(parsed_url.query)
            if "device-id" not in query_params:
                await websocket.send("Cổng hoạt động bình thường, nếu cần kiểm tra kết nối, vui lòng dùng test_page.html")
                await websocket.close()
                return
            else:
                websocket.request.headers["device-id"] = query_params["device-id"][0]
            if "client-id" in query_params:
                websocket.request.headers["client-id"] = query_params["client-id"][0]
            if "authorization" in query_params:
                websocket.request.headers["authorization"] = query_params[
                    "authorization"
                ][0]

        """Xử lý kết nối mới, mỗi lần tạo một ConnectionHandler độc lập"""
        # Xác thực trước, sau đó thiết lập kết nối
        try:
            await self._handle_auth(websocket)
        except AuthenticationError:
            await websocket.send("Xác thực thất bại")
            await websocket.close()
            return
        # Truyền instance server hiện tại khi tạo ConnectionHandler
        handler = ConnectionHandler(
            self.config,
            self._vad,
            self._asr,
            self._llm,
            self._memory,
            self._intent,
            self,  # Truyền instance server
        )
        try:
            await handler.handle_connection(websocket)
        except Exception as e:
            self.logger.bind(tag=TAG).error(f"Lỗi khi xử lý kết nối: {e}")
        finally:
            # Buộc đóng kết nối (nếu chưa đóng)
            try:
                # Kiểm tra an toàn trạng thái WebSocket và đóng
                if hasattr(websocket, "closed") and not websocket.closed:
                    await websocket.close()
                elif hasattr(websocket, "state") and websocket.state.name != "CLOSED":
                    await websocket.close()
                else:
                    # Nếu không có thuộc tính closed, thử đóng trực tiếp
                    await websocket.close()
            except Exception as close_error:
                self.logger.bind(tag=TAG).error(
                    f"Lỗi khi server buộc đóng kết nối: {close_error}"
                )

    async def _http_response(self, websocket, request_headers):
        # Kiểm tra xem có phải yêu cầu nâng cấp WebSocket không
        if request_headers.headers.get("connection", "").lower() == "upgrade":
            # Nếu là yêu cầu WebSocket, trả về None để cho phép bắt tay tiếp tục
            return None
        else:
            # Nếu là yêu cầu HTTP thường, trả về "server is running"
            return websocket.respond(200, "Server is running\n")

    async def update_config(self) -> bool:
        """Cập nhật cấu hình server và khởi tạo lại các thành phần

        Returns:
            bool: 更新是否成功
        """
        try:
            async with self.config_lock:
                # Lấy lại cấu hình (dùng phiên bản bất đồng bộ)
                new_config = await get_config_from_api_async(self.config)
                if new_config is None:
                    self.logger.bind(tag=TAG).error("Lấy cấu hình mới thất bại")
                    return False
                self.logger.bind(tag=TAG).info(f"Lấy cấu hình mới thành công")
                # Kiểm tra xem loại VAD và ASR có cần cập nhật không
                update_vad = check_vad_update(self.config, new_config)
                update_asr = check_asr_update(self.config, new_config)
                self.logger.bind(tag=TAG).info(
                    f"Kiểm tra xem loại VAD và ASR có cần cập nhật không: {update_vad} {update_asr}"
                )
                # Cập nhật cấu hình
                self.config = new_config
                # Khởi tạo lại các thành phần
                modules = initialize_modules(
                    self.logger,
                    new_config,
                    update_vad,
                    update_asr,
                    "LLM" in new_config["selected_module"],
                    False,
                    "Memory" in new_config["selected_module"],
                    "Intent" in new_config["selected_module"],
                )

                # Cập nhật instance thành phần
                if "vad" in modules:
                    self._vad = modules["vad"]
                if "asr" in modules:
                    self._asr = modules["asr"]
                if "llm" in modules:
                    self._llm = modules["llm"]
                if "intent" in modules:
                    self._intent = modules["intent"]
                if "memory" in modules:
                    self._memory = modules["memory"]
                self.logger.bind(tag=TAG).info(f"Tác vụ cập nhật cấu hình hoàn tất")
                return True
        except Exception as e:
            self.logger.bind(tag=TAG).error(f"Cập nhật cấu hình server thất bại: {str(e)}")
            return False

    async def _handle_auth(self, websocket):
        # Xác thực trước, sau đó thiết lập kết nối
        if self.auth_enable:
            headers = dict(websocket.request.headers)
            device_id = headers.get("device-id", None)
            client_id = headers.get("client-id", None)
            if self.allowed_devices and device_id in self.allowed_devices:
                # Nếu thuộc danh sách thiết bị cho phép, không kiểm tra token, cho phép trực tiếp
                return
            else:
                # Ngược lại kiểm tra token
                token = headers.get("authorization", "")
                if token.startswith("Bearer "):
                    token = token[7:]  # Loại bỏ tiền tố 'Bearer '
                else:
                    raise AuthenticationError("Missing or invalid Authorization header")
                # Tiến hành xác thực
                auth_success = self.auth.verify_token(
                    token, client_id=client_id, username=device_id
                )
                if not auth_success:
                    raise AuthenticationError("Invalid token")
