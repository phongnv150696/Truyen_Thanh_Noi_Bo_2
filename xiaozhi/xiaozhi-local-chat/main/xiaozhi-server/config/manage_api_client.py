import os
import base64
from typing import Optional, Dict

import httpx

TAG = __name__


class DeviceNotFoundException(Exception):
    pass


class DeviceBindException(Exception):
    def __init__(self, bind_code):
        self.bind_code = bind_code
        super().__init__(f"Lỗi liên kết thiết bị, mã liên kết: {bind_code}")


class ManageApiClient:
    _instance = None
    _async_clients = {}  # Lưu trữ client độc lập cho mỗi vòng lặp sự kiện
    _secret = None

    def __new__(cls, config):
        """Mô hình Singleton đảm bảo duy nhất một thể hiện và hỗ trợ truyền tham số cấu hình"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._init_client(config)
        return cls._instance

    @classmethod
    def _init_client(cls, config):
        """Khởi tạo cấu hình (trì hoãn tạo client)"""
        cls.config = config.get("manager-api")

        if not cls.config:
            raise Exception("Lỗi cấu hình manager-api")

        if not cls.config.get("url") or not cls.config.get("secret"):
            raise Exception("Lỗi cấu hình url hoặc secret của manager-api")

        if "你" in cls.config.get("secret"):
            raise Exception("Vui lòng cấu hình secret cho manager-api trước")

        cls._secret = cls.config.get("secret")
        cls.max_retries = cls.config.get("max_retries", 6)  # Số lần thử lại tối đa
        cls.retry_delay = cls.config.get("retry_delay", 10)  # Thời gian chờ thử lại ban đầu (giây)
        # Không tạo AsyncClient ở đây, trì hoãn đến khi thực sự sử dụng
        cls._async_clients = {}

    @classmethod
    async def _ensure_async_client(cls):
        """Đảm bảo client bất đồng bộ đã được tạo (tạo client độc lập cho mỗi vòng lặp sự kiện)"""
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            loop_id = id(loop)

            # Tạo client độc lập cho mỗi vòng lặp sự kiện
            if loop_id not in cls._async_clients:
                cls._async_clients[loop_id] = httpx.AsyncClient(
                    base_url=cls.config.get("url"),
                    headers={
                        "User-Agent": f"PythonClient/2.0 (PID:{os.getpid()})",
                        "Accept": "application/json",
                        "Authorization": "Bearer " + cls._secret,
                    },
                    timeout=cls.config.get("timeout", 30),
                )
            return cls._async_clients[loop_id]
        except RuntimeError:
            # Nếu không có vòng lặp sự kiện đang chạy
            raise Exception("Phải được gọi trong ngữ cảnh bất đồng bộ")

    @classmethod
    async def _async_request(cls, method: str, endpoint: str, **kwargs) -> Dict:
        """Gửi yêu cầu HTTP bất đồng bộ đơn lẻ và xử lý phản hồi"""
        # Đảm bảo client đã được tạo
        client = await cls._ensure_async_client()
        endpoint = endpoint.lstrip("/")
        response = await client.request(method, endpoint, **kwargs)
        response.raise_for_status()

        result = response.json()

        # Xử lý lỗi nghiệp vụ từ API
        if result.get("code") == 10041:
            raise DeviceNotFoundException(result.get("msg"))
        elif result.get("code") == 10042:
            raise DeviceBindException(result.get("msg"))
        elif result.get("code") != 0:
            raise Exception(f"API trả về lỗi: {result.get('msg', 'Lỗi không xác định')}")

        # Trả về dữ liệu thành công
        return result.get("data") if result.get("code") == 0 else None

    @classmethod
    def _should_retry(cls, exception: Exception) -> bool:
        """Xác định xem có nên thử lại khi gặp ngoại lệ không"""
        # Lỗi liên quan đến kết nối mạng
        if isinstance(
            exception, (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError)
        ):
            return True

        # Lỗi mã trạng thái HTTP
        if isinstance(exception, httpx.HTTPStatusError):
            status_code = exception.response.status_code
            return status_code in [408, 429, 500, 502, 503, 504]

        return False

    @classmethod
    async def _execute_async_request(cls, method: str, endpoint: str, **kwargs) -> Dict:
        """Trình thực thi yêu cầu bất đồng bộ với cơ chế thử lại"""
        import asyncio
        retry_count = 0

        while retry_count <= cls.max_retries:
            try:
                # Thực hiện yêu cầu bất đồng bộ
                return await cls._async_request(method, endpoint, **kwargs)
            except Exception as e:
                # Xác định xem có nên thử lại không
                if retry_count < cls.max_retries and cls._should_retry(e):
                    retry_count += 1
                    print(
                        f"{method} {endpoint} Yêu cầu bất đồng bộ thất bại, sẽ thử lại lần thứ {retry_count} sau {cls.retry_delay:.1f} giây"
                    )
                    await asyncio.sleep(cls.retry_delay)
                    continue
                else:
                    # Không thử lại, ném ngoại lệ
                    raise

    @classmethod
    def safe_close(cls):
        """Đóng an toàn tất cả các pool kết nối bất đồng bộ"""
        import asyncio
        for client in list(cls._async_clients.values()):
            try:
                asyncio.run(client.aclose())
            except Exception:
                pass
        cls._async_clients.clear()
        cls._instance = None


async def get_server_config() -> Optional[Dict]:
    """Lấy cấu hình cơ bản của server"""
    return await ManageApiClient._instance._execute_async_request("POST", "/config/server-base")


async def get_agent_models(
    mac_address: str, client_id: str, selected_module: Dict
) -> Optional[Dict]:
    """Lấy cấu hình mô hình agent"""
    return await ManageApiClient._instance._execute_async_request(
        "POST",
        "/config/agent-models",
        json={
            "macAddress": mac_address,
            "clientId": client_id,
            "selectedModule": selected_module,
        },
    )


async def save_mem_local_short(mac_address: str, short_momery: str) -> Optional[Dict]:
    try:
        return await ManageApiClient._instance._execute_async_request(
            "PUT",
            f"/agent/saveMemory/" + mac_address,
            json={
                "summaryMemory": short_momery,
            },
        )
    except Exception as e:
        print(f"Lưu bộ nhớ ngắn hạn lên server thất bại: {e}")
        return None


async def report(
    mac_address: str, session_id: str, chat_type: int, content: str, audio, report_time
) -> Optional[Dict]:
    """Báo cáo lịch sử trò chuyện bất đồng bộ"""
    if not content or not ManageApiClient._instance:
        return None
    try:
        return await ManageApiClient._instance._execute_async_request(
            "POST",
            f"/agent/chat-history/report",
            json={
                "macAddress": mac_address,
                "sessionId": session_id,
                "chatType": chat_type,
                "content": content,
                "reportTime": report_time,
                "audioBase64": (
                    base64.b64encode(audio).decode("utf-8") if audio else None
                ),
            },
        )
    except Exception as e:
        print(f"Báo cáo thất bại: {e}")
        return None



def init_service(config):
    ManageApiClient(config)


def manage_api_http_safe_close():
    ManageApiClient.safe_close()
