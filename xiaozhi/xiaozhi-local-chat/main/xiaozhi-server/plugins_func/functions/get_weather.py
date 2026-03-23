from plugins_func.register import ActionResponse


def get_weather(conn, location: str, lang: str = "zh_CN") -> ActionResponse:
    """
    Get weather information for a location.
    This is a simplified implementation for local chat.
    """
    # For local chat, return a simple message
    weather_info = f"天气信息服务暂时不可用。位置：{location}"

    return ActionResponse(
        action=None,
        result=weather_info,
        response=weather_info
    )