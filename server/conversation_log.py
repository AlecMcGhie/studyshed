import os
import sqlite3
import uuid
import threading
import atexit
from datetime import datetime
import ollama

# persistent DB inside project data/ so it survives restarts
base_dir = os.path.dirname(os.path.dirname(__file__))  
data_dir = os.path.join(base_dir, "data")
os.makedirs(data_dir, exist_ok=True)
DB_PATH = os.path.join(data_dir, "conversations.db")

_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row
# use WAL for better concurrency
try:
    _conn.execute("PRAGMA journal_mode=WAL;")
except Exception:
    pass

_lock = threading.Lock()

def _init_db():
    with _lock:
        cur = _conn.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            created_at TEXT
        )""")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conv_id TEXT,
            role TEXT,
            content TEXT,
            ts TEXT,
            FOREIGN KEY(conv_id) REFERENCES conversations(id)
        )""")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conv_id)")
        _conn.commit()

_init_db()

def create_conversation():
    conv_id = uuid.uuid4().hex
    ts = datetime.utcnow().isoformat()
    with _lock:
        _conn.execute("INSERT INTO conversations (id, created_at) VALUES (?, ?)", (conv_id, ts))
        _conn.commit()
    return conv_id

def append_message(conv_id, role, content):
    ts = datetime.utcnow().isoformat()
    with _lock:
        _conn.execute(
            "INSERT INTO messages (conv_id, role, content, ts) VALUES (?, ?, ?, ?)",
            (conv_id, role, content, ts)
        )
        _conn.commit()

def get_conversation_messages(conv_id):
    with _lock:
        cur = _conn.execute(
            "SELECT role, content, ts FROM messages WHERE conv_id = ? ORDER BY id ASC",
            (conv_id,)
        )
        rows = cur.fetchall()
    return [{"role": r["role"], "content": r["content"], "ts": r["ts"]} for r in rows]

def get_all_conversations():
    with _lock:
        cur = _conn.execute("SELECT id, created_at FROM conversations ORDER BY created_at DESC")
        rows = cur.fetchall()
    return [{"id": r["id"], "created_at": r["created_at"]} for r in rows]

def cleanup():
    try:
        with _lock:
            cur = _conn.cursor()
            cur.execute("SELECT id FROM conversations WHERE id NOT IN (SELECT conv_id FROM messages)")
            conversations_to_delete = [row["id"] for row in cur.fetchall()]
            if conversations_to_delete:
                cur.execute("DELETE FROM conversations WHERE id IN ({})".format(','.join(['?']*len(conversations_to_delete))), conversations_to_delete)
                _conn.commit()
            
            # TODO Add functionality for summarizing each conversation
            
        _conn.close()
    except Exception:
        pass

atexit.register(cleanup)