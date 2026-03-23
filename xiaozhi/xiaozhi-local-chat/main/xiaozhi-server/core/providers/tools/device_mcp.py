"""
MCP (Model Context Protocol) client for device communication.
Simplified implementation for local chat version.
"""


class MCPClient:
    """MCP Client for device communication"""

    def __init__(self):
        """Initialize MCP client"""
        pass


async def send_mcp_initialize_message(conn):
    """
    Send MCP initialization message.
    In local version, this does nothing.
    """
    pass


async def send_mcp_tools_list_request(conn):
    """
    Send MCP tools list request.
    In local version, this does nothing.
    """
    pass


async def handle_mcp_message(conn, message):
    """
    Handle MCP messages.
    In local version, this does nothing.
    """
    pass