
import requests
import json

def fetch_ollama_models():
    """
    Fetches the list of all available models from the official Ollama API.
    """
    api_url = "https://ollama.com/api/tags"
    print("Fetching models from Ollama API...")

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()

        # We are interested in the 'models' list from the response
        models = data.get('models', [])
        print(f"Successfully fetched {len(models)} models.")
        return models

    except requests.exceptions.RequestException as e:
        print(f"Error fetching model list from API: {e}")
        return None
    except json.JSONDecodeError:
        print("Error: Could not decode JSON from API response.")
        return None

def save_models_to_json(models, filename="ollama_models.json"):
    """Saves the list of models to a JSON file."""
    if models:
        # For now, we don't have RAM info, so we'll save the raw data.
        # We can add a placeholder for 'required_ram_gb' if needed later.
        with open(filename, 'w') as f:
            json.dump(models, f, indent=4)
        print(f"Successfully saved {len(models)} models to {filename}")

if __name__ == "__main__":
    ollama_models = fetch_ollama_models()
    if ollama_models:
        save_models_to_json(ollama_models)
