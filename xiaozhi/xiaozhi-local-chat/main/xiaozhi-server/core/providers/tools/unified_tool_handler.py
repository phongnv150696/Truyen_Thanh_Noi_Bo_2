"""
Unified tool handler for managing various tools.
Simplified implementation for local chat version.
"""


class UnifiedToolHandler:
    """Unified tool handler"""

    def __init__(self, config):
        """Initialize tool handler"""
        self.config = config

    async def handle_tool_call(self, conn, tool_call):
        """
        Handle tool calls.
        In local version, this does nothing.
        """
        pass

    async def get_available_tools(self):
        """
        Get available tools.
        In local version, returns empty list.
        """
        return []