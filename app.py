from flask import Flask, render_template, request, jsonify, Response
import ollama
import json
import psutil

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
        response = ollama.list()
        # The ollama library now returns a dictionary, so we access the models list via the 'models' key.
        models_list = response['models']
        model_details = []
        for m in models_list:
            # Details are now directly accessible in the model dictionary.
            model_details.append({
                'name': m.get('name', ''),
                'active': m.get('name', '') == active_model,
                'size': m.get('size', None),
                'digest': m.get('digest', None),
                'modified_at': m.get('modified_at', ''),
                'family': m.get('details', {}).get('family', 'Unknown'),
                'format': m.get('details', {}).get('format', 'Unknown'),
                'parameter_size': m.get('details', {}).get('parameter_size', 'Unknown'),
                'quantization_level': m.get('details', {}).get('quantization_level', 'Unknown'),
                'license': m.get('details', {}).get('license', 'Unknown'),
            })
        return jsonify({'models': model_details, 'port': 11434})
    except Exception as e:
        print("API error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/activate', methods=['POST'])
def activate_model_route():
    global active_model
    data = request.get_json()
    model_name = data.get('model_name')
    if model_name:
        active_model = model_name
        return jsonify({'success': True, 'message': f'Model {model_name} activated.'})
    return jsonify({'success': False, 'message': 'No model name provided.'}), 400

@app.route('/api/models/download', methods=['POST'])
def download_model():
    data = request.get_json()
    model_name = data.get('model_name')
    if not model_name:
        return jsonify({'status': 'error', 'message': 'Model name is required.'}), 400

    def generate():
        try:
            stream = ollama.pull(model_name, stream=True)
            for chunk in stream:
                yield json.dumps(chunk) + '\n'
        except Exception as e:
            yield json.dumps({'status': 'error', 'message': str(e)}) + '\n'

    return Response(generate(), mimetype='application/json')

@app.route('/api/models/delete', methods=['DELETE'])
def delete_model():
    data = request.get_json()
    model_name = data.get('model_name')
    if not model_name:
        return jsonify({'success': False, 'message': 'No model name provided.'}), 400
    try:
        ollama.delete(model_name)
        return jsonify({'success': True, 'message': f'Model {model_name} deleted.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/system/hardware')
def system_hardware():
    try:
        memory = psutil.virtual_memory()
        return jsonify({
            'total_memory': memory.total,
            'used_memory': memory.used,
            'available_memory': memory.available
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ollama/library')
def ollama_library():
    try:
        with open('ollama_models.json', 'r') as f:
            models = json.load(f)
        return jsonify(models)
    except FileNotFoundError:
        return jsonify({"error": "Ollama models file not found. Please run the fetch_models.py script."}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
