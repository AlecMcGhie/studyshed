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
    
    
if __name__ == '__main__':
    app.run(debug=True)
