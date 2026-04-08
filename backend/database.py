import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

DATABASE_PATH = Path(__file__).parent.parent / "data" / "ai_crawler.db"


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database schema"""
    conn = get_db()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS news_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'custom',
                api_base_url TEXT NOT NULL,
                auth_key TEXT DEFAULT '',
                config TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_fetch_at TIMESTAMP,
                article_count INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER NOT NULL,
                external_id TEXT DEFAULT '',
                title TEXT NOT NULL,
                link TEXT DEFAULT '',
                content TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                author TEXT DEFAULT '',
                published_at TIMESTAMP,
                fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                provider TEXT NOT NULL DEFAULT 'siliconflow',
                api_key TEXT NOT NULL,
                base_url TEXT NOT NULL,
                model TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fetch_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER,
                status TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            INSERT OR IGNORE INTO ai_config (id, provider, api_key, base_url, model)
            VALUES (1, 'siliconflow', '', 'https://api.siliconflow.cn/v1', 'Qwen/Qwen2.5-7B-Instruct');
        """)
        conn.commit()
    finally:
        conn.close()


# News Sources CRUD
def get_all_sources() -> List[Dict[str, Any]]:
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM news_sources ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_source_by_id(source_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM news_sources WHERE id = ?", (source_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_source(name: str, source_type: str, api_base_url: str, auth_key: str = "", config: dict = None) -> int:
    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO news_sources (name, source_type, api_base_url, auth_key, config)
               VALUES (?, ?, ?, ?, ?)""",
            (name, source_type, api_base_url, auth_key, json.dumps(config or {}))
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def update_source(source_id: int, **kwargs) -> bool:
    fields = []
    values = []
    for k, v in kwargs.items():
        if k in ("name", "source_type", "api_base_url", "auth_key", "config"):
            fields.append(f"{k} = ?")
            values.append(json.dumps(v) if k == "config" else v)
    if not fields:
        return False
    fields.append("updated_at = CURRENT_TIMESTAMP")
    values.append(source_id)
    conn = get_db()
    try:
        conn.execute(f"UPDATE news_sources SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        return True
    finally:
        conn.close()


def delete_source(source_id: int) -> bool:
    conn = get_db()
    try:
        conn.execute("DELETE FROM articles WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM news_sources WHERE id = ?", (source_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def update_source_fetch_time(source_id: int, article_count: int):
    conn = get_db()
    try:
        conn.execute(
            """UPDATE news_sources
               SET last_fetch_at = CURRENT_TIMESTAMP, article_count = ?
               WHERE id = ?""",
            (article_count, source_id)
        )
        conn.commit()
    finally:
        conn.close()


# Articles CRUD
def get_articles(source_id: Optional[int] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    sql = "SELECT * FROM articles"
    params = []
    if source_id:
        sql += " WHERE source_id = ?"
        params.append(source_id)
    sql += " ORDER BY published_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    conn = get_db()
    try:
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_article_by_id(article_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_article_by_external_id(source_id: int, external_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM articles WHERE source_id = ? AND external_id = ?",
            (source_id, external_id)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_article(source_id: int, title: str, external_id: str = "", link: str = "",
                   content: str = "", author: str = "", published_at: datetime = None) -> int:
    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO articles (source_id, external_id, title, link, content, author, published_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (source_id, external_id, title, link, content, author, published_at)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def update_article_summary(article_id: int, summary: str):
    conn = get_db()
    try:
        conn.execute("UPDATE articles SET summary = ? WHERE id = ?", (summary, article_id))
        conn.commit()
    finally:
        conn.close()


# AI Config
def get_ai_config() -> Dict[str, Any]:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM ai_config WHERE id = 1").fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_ai_config(provider: str, api_key: str, base_url: str, model: str):
    conn = get_db()
    try:
        conn.execute(
            """INSERT OR REPLACE INTO ai_config (id, provider, api_key, base_url, model, updated_at)
               VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
            (provider, api_key, base_url, model)
        )
        conn.commit()
    finally:
        conn.close()


# Fetch Logs
def add_fetch_log(source_id: Optional[int], status: str, message: str):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO fetch_logs (source_id, status, message) VALUES (?, ?, ?)",
            (source_id, status, message)
        )
        conn.commit()
    finally:
        conn.close()
