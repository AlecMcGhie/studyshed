from flask import Flask, render_template, request, jsonify
import ollama

app = Flask(__name__)

# Define your menu items here
MENU_ITEMS = [
    {'key': 'chat', 'label': 'Chat'},
    {'key': 'flashcards', 'label': 'Flashcards'},
    {'key': 'podcast', 'label': 'Podcast'},
    {'key': 'calendar', 'label': 'Calendar'}
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
            # Try to get a message to generate from ollama
            response = ollama.generate(model= active_model, prompt = msg)
            message_text = response['response']
            return jsonify({"reply": message_text})
        except Exception as e:
            return jsonify({"reply": str(e)})
    else:
        return jsonify({"error": "No message provided"})
    
    
if __name__ == '__main__':
    app.run(debug=True)
