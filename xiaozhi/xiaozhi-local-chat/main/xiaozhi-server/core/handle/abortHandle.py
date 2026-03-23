import json

TAG = __name__


async def handleAbortMessage(conn):
    conn.logger.bind(tag=TAG).info("Abort message received")
    
    # Set abort flag to stop all tasks
    conn.client_abort = True
    conn.llm_finish_task = True  # Force stop LLM
    
    # Clear all queues
    conn.clear_queues()
    
    # Stop client speaking state
    conn.client_is_speaking = False
    
    # Send stop signal to client
    await conn.websocket.send(
        json.dumps({"type": "tts", "state": "stop", "session_id": conn.session_id})
    )
    
    # Clear speaker status
    conn.clearSpeakStatus()
    
    conn.logger.bind(tag=TAG).info("Abort message processed - ready for new request")


