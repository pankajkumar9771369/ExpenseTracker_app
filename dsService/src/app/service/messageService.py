from app.utils.messagesUtil import MessagesUtil
from app.service.llmService import LLMService

class MessageService:
    def __init__(self):
        self.messageUtil = MessagesUtil()
        self.llmService = LLMService()
    
    def process_message(self, message):
        # Allow any message to be parsed by the LLM, not just bank SMSs
        return self.llmService.runLLM(message)