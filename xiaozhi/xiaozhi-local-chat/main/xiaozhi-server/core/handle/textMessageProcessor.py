import json

from core.handle.textMessageHandlerRegistry import TextMessageHandlerRegistry

TAG = __name__


class TextMessageProcessor:
    """消息处理器主类"""

    def __init__(self, registry: TextMessageHandlerRegistry):
        self.registry = registry

    async def process_message(self, conn, message: str) -> None:
        """处理消息的主入口"""
        try:
            # 解析JSON消息
            msg_json = json.loads(message)

            # 处理JSON消息
            if isinstance(msg_json, dict):
                message_type = msg_json.get("type")

                # Ghi log
                conn.logger.bind(tag=TAG).info(f"Nhận được tin nhắn {message_type}: {message}")

                # 获取并执行处理器
                handler = self.registry.get_handler(message_type)
                if handler:
                    # Don't send DEBUG_ACK to ESP32 clients - it confuses the protocol
                    # Only log for debugging
                    conn.logger.bind(tag=TAG).debug(f"DEBUG_ACK: Received {message_type}")
                    await handler.handle(conn, msg_json)
                else:
                    conn.logger.bind(tag=TAG).error(f"Nhận được tin nhắn loại không xác định: {message}")
            # Xử lý tin nhắn số
            elif isinstance(msg_json, int):
                conn.logger.bind(tag=TAG).info(f"Nhận được tin nhắn số: {message}")
                await conn.websocket.send(message)

        except json.JSONDecodeError:
            # Tin nhắn không phải JSON được chuyển tiếp trực tiếp
            conn.logger.bind(tag=TAG).error(f"Phân tích thấy tin nhắn lỗi: {message}")
            await conn.websocket.send(message)
