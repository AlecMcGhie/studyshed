from flask import Flask, render_template, request, jsonify, Response
import ollama # pyright: ignore[reportMissingImports]
import json
import requests
import atexit
from server import conversation_log


app = Flask(__name__)

# Define your menu items here
MENU_ITEMS = [
    {'key': 'chat', 'label': 'Chat'},
    {'key': 'flashcards', 'label': 'Flashcards'},
    {'key': 'podcast', 'label': 'Podcast'},
    {'key': 'calendar', 'label': 'Calendar'},
    {'key': 'modelhub', 'label': 'Model Hub'}
]

active_model = "gemma3n:e4b"

@app.route('/')
def home():
    return render_template('index.html', menu_items = MENU_ITEMS)

# new conversation endpoints
@app.route('/api/conversations', methods=['POST'])
def api_create_conversation():
    conv_id = conversation_log.create_conversation()
    return jsonify({"conversation_id": conv_id})

@app.route('/api/conversations/<conv_id>', methods=['GET'])
def api_get_conversation(conv_id):
    msgs = conversation_log.get_conversation_messages(conv_id)
    if msgs is None:
        return jsonify({"error": "not found"}), 404
    return jsonify({"id": conv_id, "messages": msgs})

@app.route('/api/chat', methods = ["POST"])
def api_chat():
    data = request.get_json()
    msg = data.get("message", "")
    conv_id = data.get("conversation_id")

    if not conv_id:
        # create conversation if not provided
        conv_id = conversation_log.create_conversation()

    if msg:
        try:
            # append user message to conversation
            conversation_log.append_message(conv_id, "user", msg)

            # load full conversation for context
            messages = conversation_log.get_conversation_messages(conv_id)
            # transform to model expected format (role/content)
            model_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

            # Streaming the output from ollama
            stream = ollama.chat(model = active_model, messages = model_messages, stream = True)

            def generate():
                assistant_accum = ""
                for chunk in stream:
                    # chunk is expected to include message content parts from ollama
                    part = chunk.get("message", {}).get("content", "")
                    assistant_accum += part
                    yield json.dumps({"reply": part}) + "\n"
                # after complete reply, persist assistant message
                if assistant_accum:
                    conversation_log.append_message(conv_id, "assistant", assistant_accum)

            return Response(generate(), mimetype= "application/json")

        except Exception as e:
            return jsonify({"reply": str(e)})
    else:
        return Response(json.dumps({"error": "No message provided"}), mimetype='application/json')
    
@app.route('/api/conversations', methods=['GET'])
def api_list_conversations():
    try:
        convs = conversation_log.get_all_conversations()
        return jsonify({"conversations": convs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/models')
def api_models():
    try:
        response = ollama.list()
        models_list = response.models
        print(models_list)
        model_details = []
        for m in models_list:
            details = getattr(m, 'details', None)
            model_details.append({
                'name': getattr(m, 'model', ''),
                'active': getattr(m, 'model', '') == active_model,
                'size': getattr(m, 'size', None),
                'digest': getattr(m, 'digest', None),
                'modified_at': str(getattr(m, 'modified_at', '')),
                'family': getattr(details, 'family', '') if details else 'Unknown',
                'format': getattr(details, 'format', '') if details else 'Unknown',
                'parameter_size': getattr(details, 'parameter_size', '') if details else 'Unknown',
                'quantization_level': getattr(details, 'quantization_level', '') if details else 'Unknown',
                'license': getattr(details, 'license', '') if details and hasattr(details, 'license') else 'Unknown',
            })
        return jsonify({'models': model_details, 'port': 11434})
    except Exception as e:
        print("API error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/set_active_model', methods=['POST'])
def api_set_active_model():
    global active_model
    data = request.get_json()
    model_name = data.get("model_name", "")
    if model_name:
        active_model = model_name
        return jsonify({"status": "success", "active_model": active_model})
    else:
        return jsonify({"status": "error", "message": "No model name provided"}), 400
    
if __name__ == '__main__':
    app.run(debug=True)
