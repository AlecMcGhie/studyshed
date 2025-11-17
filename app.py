from flask import Flask, render_template, request, jsonify, Response
import ollama
import json

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

@app.route('/api/chat', methods = ["POST"])
def api_chat():
    data = request.get_json()
    msg = data.get("message", "")
    if msg:
        try:
            messages = [
                {"role": "user", "content":msg}
            ]        
            # Streaming the output
            stream = ollama.chat(model = active_model, messages = messages, stream = True)

            def generate():
                for chunk in stream:
                    yield json.dumps({"reply": chunk["message"]["content"]}) + "\n"

            return Response(generate(), mimetype= "application/json")

        except Exception as e:
            return jsonify({"reply": str(e)})
    else:
        return Response(json.dumps({"error": "No message provided"}), mimetype='application/json')
    
@app.route('/api/models')
def api_models():
    try:
        response = ollama.list()  # This returns a ListResponse object
        print("Ollama list() output:", response, type(response))
        models_list = response.models  # <- This is the list of Model objects

        model_details = []
        for m in models_list:
            name = m.model
            model_details.append({
                'name': name,
                'active': name == active_model,
                'size': m.size,
                'digest': m.digest,
                'modified_at': str(m.modified_at),
                'family': getattr(m.details, 'family', ''),
                'parameter_size': getattr(m.details, 'parameter_size', ''),
                'quantization_level': getattr(m.details, 'quantization_level', ''),
            })
        return jsonify({'models': model_details, 'port': 11434})
    except Exception as e:
        print("API error:", e)
        return jsonify({'error': str(e)}), 500



    
if __name__ == '__main__':
    app.run(debug=True)
