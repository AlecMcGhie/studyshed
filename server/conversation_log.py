# Database system for chat log
import sqlite3
import tempfile
import uuid
import atexit
import os
import threading
from datetime import datetime

# ephemeral DB file in OS temp dir, deleted on exit
DB_PATH = os.path.join(tempfile.gettempdir(), f"studyshed_conv_{os.getpid()}_{uuid.uuid4().hex}.db")
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row
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
            "SELECT role, content, ts FROM messages WHERE conv_id = ? ORDER BY id ASC", (conv_id,)
        )
        rows = cur.fetchall()
    return [{"role": r["role"], "content": r["content"], "ts": r["ts"]} for r in rows]

def cleanup():
    try:
        _conn.close()
    finally:
        try:
            os.remove(DB_PATH)
        except Exception:
            pass

atexit.register(cleanup)