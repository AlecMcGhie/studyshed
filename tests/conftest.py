import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_ollama():
    """Provides the MagicMock object for ollama."""
    return MagicMock()

@pytest.fixture
def app(mock_ollama):
    """
    App fixture that patches 'ollama' in sys.modules before importing the app.
    This ensures that from the moment the app is imported, it sees the mock.
    """
    with patch.dict('sys.modules', {'ollama': mock_ollama}):
        from app import app as flask_app
        flask_app.config.update({"TESTING": True})
        yield flask_app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()
