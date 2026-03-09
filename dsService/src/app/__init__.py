from flask import Flask
from flask import request, jsonify
from .service.messageService import MessageService
from kafka import KafkaProducer
import json
import os
import jsonpickle

app = Flask(__name__)
app.config.from_pyfile('config.py')

messageService = MessageService()
kafka_host = os.getenv('KAFKA_HOST', 'localhost')
kafka_port = os.getenv('KAFKA_PORT', '9092')
kafka_bootstrap_servers = f"{kafka_host}:{kafka_port}"
print("Kafka server is "+kafka_bootstrap_servers)
print("\n")
producer = KafkaProducer(bootstrap_servers=kafka_bootstrap_servers,
                         value_serializer=lambda v: json.dumps(v).encode('utf-8'))

@app.route('/v1/ds/message', methods=['POST'])
def handle_message():
    user_id = request.headers.get('x-user-id')
    if not user_id:
        return jsonify({'error': 'x-user-id header is required'}), 400

    message = request.json.get('message')
    result = messageService.process_message(message)

    if result is not None:
        serialized_result = result.serialize()
        serialized_result['user_id'] = user_id
        producer.send('expense_service', serialized_result)
        return jsonify(serialized_result)
    else:
        return jsonify({'error': 'Invalid message format'}), 400

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage

@app.route('/v1/ds/ask', methods=['POST'])
def handle_ask():
    user_id = request.headers.get('x-user-id')
    if not user_id:
        return jsonify({'error': 'x-user-id header is required'}), 400

    data = request.json
    question = data.get('question', '')
    context_data = data.get('context', '[]')
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400

    # Simple direct Mistral call for Q&A
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return jsonify({'error': 'Missing API key'}), 500
        
    chat = ChatMistralAI(api_key=api_key, model="mistral-large-latest", temperature=0.7)
    
    sys_msg = SystemMessage(content=f"You are a helpful financial assistant for the user's Expense Tracker app. Answer their question based ONLY on their expense history provided below as JSON. Be concise, friendly, and use formatting.\n\nExpenses:\n{context_data}")
    usr_msg = HumanMessage(content=question)
    
    try:
        response = chat.invoke([sys_msg, usr_msg])
        return jsonify({'answer': response.content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def handle_get():
    return 'Hello world'

@app.route('/health', methods=['GET'])
def health_check():
    return 'OK'

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8010, debug=True)