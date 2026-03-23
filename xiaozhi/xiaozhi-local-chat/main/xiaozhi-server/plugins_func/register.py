from enum import Enum


class Action(Enum):
    RESPONSE = "response"
    NOTFOUND = "notfound"
    ERROR = "error"
    REQLLM = "reqllm"


class ActionResponse:
    def __init__(self, action=None, result=None, response=None):
        self.action = action
        self.result = result
        self.response = response