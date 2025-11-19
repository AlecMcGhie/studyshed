import json
from unittest.mock import MagicMock

def test_home(client):
    """Test the home page."""
    response = client.get('/')
    assert response.status_code == 200

def test_api_models(client, mock_ollama):
    """Test the /api/models endpoint."""
    mock_ollama.list.return_value = {
        'models': [
            {
                'name': 'test-model',
                'size': 12345,
                'digest': 'abcdef123456',
                'modified_at': '2023-10-26T10:00:00Z',
                'details': {
                    'family': 'test-family',
                    'format': 'gguf',
                    'parameter_size': '7B',
                    'quantization_level': 'Q4_0',
                }
            }
        ]
    }
    response = client.get('/api/models')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'models' in data
    assert len(data['models']) == 1
    assert data['models'][0]['name'] == 'test-model'
    assert not data['models'][0]['active']

def test_activate_model(client):
    """Test the /api/models/activate endpoint."""
    response = client.post('/api/models/activate', json={'model_name': 'test-model'})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success']
    assert data['message'] == 'Model test-model activated.'

def test_download_model(client, mock_ollama):
    """Test the /api/models/download endpoint."""
    mock_ollama.pull.return_value = iter([
        {'status': 'downloading', 'completed': 10, 'total': 100},
        {'status': 'verifying', 'completed': 50, 'total': 100},
        {'status': 'success'}
    ])
    response = client.post('/api/models/download', json={'model_name': 'test-model'})
    assert response.status_code == 200
    lines = response.data.decode().strip().split('\n')
    assert len(lines) == 3
    assert json.loads(lines[0])['status'] == 'downloading'

def test_delete_model(client, mock_ollama):
    """Test the /api/models/delete endpoint."""
    response = client.delete('/api/models/delete', json={'model_name': 'test-model'})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success']
    assert data['message'] == 'Model test-model deleted.'
    mock_ollama.delete.assert_called_with('test-model')

def test_api_chat(client, mock_ollama):
    """Test the /api/chat endpoint."""
    mock_ollama.chat.return_value = iter([
        {'message': {'content': 'Hello'}},
        {'message': {'content': ' World'}},
    ])
    response = client.post('/api/chat', json={'message': 'Hello'})
    assert response.status_code == 200
    lines = response.data.decode().strip().split('\n')
    assert len(lines) == 2
    assert json.loads(lines[0])['reply'] == 'Hello'
    assert json.loads(lines[1])['reply'] == ' World'
