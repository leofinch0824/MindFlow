import aiosqlite
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

DATABASE_PATH = Path(__file__).parent.parent / "data" / "ai_crawler.db"


async def init_db():
    """Initialize database schema"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.executescript("""
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
        await db.commit()


async def get_db():
    """Get database connection"""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    return db


# News Sources CRUD
async def get_all_sources() -> List[Dict[str, Any]]:
    async with await get_db() as db:
        rows = await db.execute("SELECT * FROM news_sources ORDER BY created_at DESC")
        return [dict(row) for row in await rows.fetchall()]


async def get_source_by_id(source_id: int) -> Optional[Dict[str, Any]]:
    async with await get_db() as db:
        row = await db.execute("SELECT * FROM news_sources WHERE id = ?", (source_id,))
        result = await row.fetchone()
        return dict(result) if result else None


async def create_source(name: str, source_type: str, api_base_url: str, auth_key: str = "", config: dict = None) -> int:
    async with await get_db() as db:
        cursor = await db.execute(
            """INSERT INTO news_sources (name, source_type, api_base_url, auth_key, config)
               VALUES (?, ?, ?, ?, ?)""",
            (name, source_type, api_base_url, auth_key, json.dumps(config or {}))
        )
        await db.commit()
        return cursor.lastrowid


async def update_source(source_id: int, **kwargs) -> bool:
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
    async with await get_db() as db:
        await db.execute(f"UPDATE news_sources SET {', '.join(fields)} WHERE id = ?", values)
        await db.commit()
        return True


async def delete_source(source_id: int) -> bool:
    async with await get_db() as db:
        await db.execute("DELETE FROM articles WHERE source_id = ?", (source_id,))
        await db.execute("DELETE FROM news_sources WHERE id = ?", (source_id,))
        await db.commit()
        return True


async def update_source_fetch_time(source_id: int, article_count: int):
    async with await get_db() as db:
        await db.execute(
            """UPDATE news_sources
               SET last_fetch_at = CURRENT_TIMESTAMP, article_count = ?
               WHERE id = ?""",
            (article_count, source_id)
        )
        await db.commit()


# Articles CRUD
async def get_articles(source_id: Optional[int] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    sql = "SELECT * FROM articles"
    params = []
    if source_id:
        sql += " WHERE source_id = ?"
        params.append(source_id)
    sql += " ORDER BY published_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    async with await get_db() as db:
        rows = await db.execute(sql, params)
        return [dict(row) for row in await rows.fetchall()]


async def get_article_by_id(article_id: int) -> Optional[Dict[str, Any]]:
    async with await get_db() as db:
        row = await db.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
        result = await row.fetchone()
        return dict(result) if result else None


async def get_article_by_external_id(source_id: int, external_id: str) -> Optional[Dict[str, Any]]:
    async with await get_db() as db:
        row = await db.execute(
            "SELECT * FROM articles WHERE source_id = ? AND external_id = ?",
            (source_id, external_id)
        )
        result = await row.fetchone()
        return dict(result) if result else None


async def create_article(source_id: int, title: str, external_id: str = "", link: str = "",
                         content: str = "", author: str = "", published_at: datetime = None) -> int:
    async with await get_db() as db:
        cursor = await db.execute(
            """INSERT INTO articles (source_id, external_id, title, link, content, author, published_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (source_id, external_id, title, link, content, author, published_at)
        )
        await db.commit()
        return cursor.lastrowid


async def update_article_summary(article_id: int, summary: str):
    async with await get_db() as db:
        await db.execute("UPDATE articles SET summary = ? WHERE id = ?", (summary, article_id))
        await db.commit()


# AI Config
async def get_ai_config() -> Dict[str, Any]:
    async with await get_db() as db:
        row = await db.execute("SELECT * FROM ai_config WHERE id = 1")
        result = await row.fetchone()
        return dict(result) if result else None


async def update_ai_config(provider: str, api_key: str, base_url: str, model: str):
    async with await get_db() as db:
        await db.execute(
            """INSERT OR REPLACE INTO ai_config (id, provider, api_key, base_url, model, updated_at)
               VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
            (provider, api_key, base_url, model)
        )
        await db.commit()


# Fetch Logs
async def add_fetch_log(source_id: Optional[int], status: str, message: str):
    async with await get_db() as db:
        await db.execute(
            "INSERT INTO fetch_logs (source_id, status, message) VALUES (?, ?, ?)",
            (source_id, status, message)
        )
        await db.commit()
