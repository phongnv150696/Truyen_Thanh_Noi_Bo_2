import sys
import uuid
import signal
import asyncio
from aioconsole import ainput
from config.settings import load_config
from config.logger import setup_logging
from core.utils.util import get_local_ip, validate_mcp_endpoint
from core.http_server import SimpleHttpServer
from core.websocket_server import WebSocketServer
from core.utils.util import check_ffmpeg_installed
from core.utils.gc_manager import get_gc_manager

TAG = __name__
print("*****************************************************************", flush=True)
print("**************** DEBUG MODE ACTIVE *****************************", flush=True)
print("*****************************************************************", flush=True)
logger = setup_logging()


async def wait_for_exit() -> None:
    """
    Chờ cho đến khi nhận được Ctrl-C / SIGTERM。
    - Unix: Sử dụng add_signal_handler
    - Windows: Phụ thuộc KeyboardInterrupt
    """
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    if sys.platform != "win32":  # Unix / macOS
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, stop_event.set)
        await stop_event.wait()
    else:
        # Windows：await một future pending mãi mãi,
        # để KeyboardInterrupt bubble lên asyncio.run, từ đó loại bỏ vấn đề luồng thường bị treo làm process không thoát được
        try:
            await asyncio.Future()
        except KeyboardInterrupt:  # Ctrl‑C
            pass


async def monitor_stdin():
    """Theo dõi standard input, tiêu thụ phím Enter"""
    while True:
        await ainput()  # Chờ nhập không đồng bộ, tiêu thụ phím Enter


async def main():
    check_ffmpeg_installed()
    config = load_config()

    # Độ ưu tiên auth_key: cấu hình server.auth_key > manager-api.secret > tự động tạo
    # auth_key dùng cho xác thực jwt, ví dụ xác thực jwt của giao diện phân tích hình ảnh, tạo token giao diện ota và xác thực websocket
    # Lấy auth_key trong cấu hình
    auth_key = config["server"].get("auth_key", "")
    
    # Xác thực auth_key, nếu không hợp lệ thì thử dùng manager-api.secret
    if not auth_key or len(auth_key) == 0 or "你" in auth_key:
        auth_key = config.get("manager-api", {}).get("secret", "")
        # Xác thực secret, nếu không hợp lệ thì tạo khóa ngẫu nhiên
        if not auth_key or len(auth_key) == 0 or "你" in auth_key:
            auth_key = str(uuid.uuid4().hex)
    
    config["server"]["auth_key"] = auth_key


    # Thêm nhiệm vụ giám sát stdin
    stdin_task = asyncio.create_task(monitor_stdin())

    # Khởi động trình quản lý GC toàn cục (dọn dẹp mỗi 5 phút)
    gc_manager = get_gc_manager(interval_seconds=300)
    await gc_manager.start()

    # Khởi động WebSocket Server
    ws_server = WebSocketServer(config)
    ws_task = asyncio.create_task(ws_server.start())
    # Khởi động Simple HTTP Server
    ota_server = SimpleHttpServer(config, ws_server)
    ota_task = asyncio.create_task(ota_server.start())

    read_config_from_api = config.get("read_config_from_api", False)
    port = int(config["server"].get("http_port", 8003))
    if not read_config_from_api:
        logger.bind(tag=TAG).info(
            "Giao diện OTA là\t\thttp://{}:{}/xiaozhi/ota/",
            get_local_ip(),
            port,
        )
    logger.bind(tag=TAG).info(
        "Giao diện phân tích hình ảnh là\thttp://{}:{}/mcp/vision/explain",
        get_local_ip(),
        port,
    )
    mcp_endpoint = config.get("mcp_endpoint", None)
    if mcp_endpoint is not None and "你" not in mcp_endpoint:
        # Xác thực định dạng điểm truy cập MCP
        if validate_mcp_endpoint(mcp_endpoint):
            logger.bind(tag=TAG).info("Điểm truy cập MCP là\t{}", mcp_endpoint)
            # Chuyển địa chỉ điểm truy cập mcp thành điểm gọi
            mcp_endpoint = mcp_endpoint.replace("/mcp/", "/call/")
            config["mcp_endpoint"] = mcp_endpoint
        else:
            logger.bind(tag=TAG).error("Điểm truy cập MCP không đúng định dạng")
            config["mcp_endpoint"] = "Địa chỉ websocket điểm truy cập của bạn"

    # Lấy cấu hình WebSocket, sử dụng giá trị mặc định an toàn
    # Lấy cấu hình WebSocket, sử dụng giá trị mặc định an toàn
    websocket_port = 8001 # HARDCODED FOR DEBUGGING
    server_config = config.get("server", {})
    if isinstance(server_config, dict):
        # websocket_port = int(server_config.get("port", 8000))
        websocket_port = 8001 # FORCE 8001
        config["server"]["port"] = websocket_port # CRITICAL FIX: Update actual config

    logger.bind(tag=TAG).info(
        "Địa chỉ Websocket là\tws://{}:{}/xiaozhi/v1/",
        get_local_ip(),
        websocket_port,
    )

    logger.bind(tag=TAG).info(
        "=======Địa chỉ trên là giao thức websocket, vui lòng không mở bằng trình duyệt======="
    )
    logger.bind(tag=TAG).info(
        "Nếu muốn thử nghiệm websocket hãy dùng trình duyệt Chrome mở file test_page.html trong thư mục test"
    )
    logger.bind(tag=TAG).info(
        "=============================================================\n"
    )

    try:
        await wait_for_exit()  # Chờ tín hiệu thoát
    except asyncio.CancelledError:
        print("Tác vụ bị hủy, đang dọn dẹp tài nguyên...")
    finally:
        # Dừng trình quản lý GC toàn cục
        await gc_manager.stop()

        # Hủy tất cả tác vụ (điểm sửa lỗi quan trọng)
        stdin_task.cancel()
        ws_task.cancel()
        if ota_task:
            ota_task.cancel()

        # Chờ tác vụ kết thúc (phải có timeout)
        await asyncio.wait(
            [stdin_task, ws_task, ota_task] if ota_task else [stdin_task, ws_task],
            timeout=3.0,
            return_when=asyncio.ALL_COMPLETED,
        )
        print("Máy chủ đã đóng, chương trình thoát.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Ngắt thủ công, chương trình chấm dứt.")
