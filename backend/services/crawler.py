import httpx
import json
import re
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from database import (
    get_source_by_id, create_article, get_article_by_external_id,
    update_source_fetch_time, add_fetch_log
)


BASE_URL = "https://down.mptext.top"
TIMEOUT = 30


def normalize_format(value: str) -> str:
    """Normalize format parameter"""
    f = value.lower()
    if f in {"md", "markdown"}:
        return "markdown"
    if f in {"txt", "text"}:
        return "text"
    if f in {"htm", "html"}:
        return "html"
    if f == "json":
        return "json"
    return "markdown"


async def http_get(path: str, params: Dict[str, str], auth_key: str = "") -> str:
    """Make HTTP GET request"""
    query = "&".join([f"{k}={v}" for k, v in params.items()])
    url = f"{BASE_URL}{path}?{query}" if query else f"{BASE_URL}{path}"

    headers = {
        "User-Agent": "ai-crawler/1.0 (+python)",
        "Accept": "*/*"
    }
    if auth_key:
        headers["X-Auth-Key"] = auth_key

    async with httpx.AsyncClient(timeout=TIMEOUT, proxy=None) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.text


def validate_response(response_text: str) -> dict:
    """Validate API response"""
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError("响应不是合法 JSON")

    base_resp = data.get("base_resp", {})
    ret = base_resp.get("ret")
    if ret is not None and str(ret) != "0":
        err_msg = base_resp.get("err_msg", "未知错误")
        raise ValueError(f"API 错误: {err_msg}")

    return data


async def search_account(keyword: str, auth_key: str = "", begin: int = 0, size: int = 5) -> List[Dict]:
    """Search for WeChat official account by keyword"""
    data = await http_get(
        "/api/public/v1/account",
        {"keyword": keyword, "begin": str(begin), "size": str(size)},
        auth_key
    )
    result = validate_response(data)
    return result.get("list", [])


async def get_articles_by_fakeid(fakeid: str, auth_key: str = "", begin: int = 0, size: int = 5) -> List[Dict]:
    """Get article list by fakeid"""
    data = await http_get(
        "/api/public/v1/article",
        {"fakeid": fakeid, "begin": str(begin), "size": str(size)},
        auth_key
    )
    result = validate_response(data)
    return result.get("articles", [])


async def download_article(url: str, fmt: str = "markdown", auth_key: str = "") -> str:
    """Download article content"""
    format_str = normalize_format(fmt)
    data = await http_get(
        "/api/public/v1/download",
        {"url": url, "format": format_str},
        auth_key
    )
    return data


async def fetch_source_articles(source_id: int) -> tuple[int, str]:
    """Fetch all articles from a source"""
    source = await get_source_by_id(source_id)
    if not source:
        return 0, "新闻源不存在"

    source_config = json.loads(source["config"]) if source["config"] else {}
    auth_key = source.get("auth_key", "") or ""

    if source["source_type"] == "mptext":
        fakeid = source_config.get("fakeid")
        if not fakeid:
            return 0, "MPText 配置缺少 fakeid"

        try:
            # Get articles list
            articles = await get_articles_by_fakeid(fakeid, auth_key, begin=0, size=20)
            added_count = 0

            for article in articles:
                external_id = article.get("mid", "") or article.get("link", "")
                title = article.get("title", "无标题")
                link = article.get("link", "")
                update_time = article.get("update_time", 0)

                # Check if article already exists
                existing = await get_article_by_external_id(source_id, external_id)
                if existing:
                    continue

                # Parse update_time to datetime
                published_at = None
                if update_time:
                    try:
                        published_at = datetime.fromtimestamp(update_time).strftime("%Y-%m-%d %H:%M:%S")
                    except:
                        pass

                # Download article content
                content = ""
                try:
                    content = await download_article(link, "markdown", auth_key)
                    # Clean up content
                    content = clean_markdown_content(content)
                except Exception as e:
                    content = f"内容下载失败: {str(e)}"

                # Create article in database
                await create_article(
                    source_id=source_id,
                    title=title,
                    external_id=external_id,
                    link=link,
                    content=content,
                    author=source["name"],
                    published_at=published_at
                )
                added_count += 1

            # Update source fetch time and count
            await update_source_fetch_time(source_id, len(articles))
            await add_fetch_log(source_id, "success", f"成功抓取 {added_count} 篇新文章")
            return added_count, "抓取成功"

        except Exception as e:
            await add_fetch_log(source_id, "failed", str(e))
            return 0, f"抓取失败: {str(e)}"

    else:
        # Custom source type - placeholder for other APIs
        return 0, "暂不支持此类型的新闻源"


def clean_markdown_content(content: str) -> str:
    """Clean and normalize markdown content"""
    if not content:
        return ""

    lines = content.split("\n")
    cleaned_lines = []
    skip_patterns = [
        r"^#\s*$",
        r"^\s*$",
        r"^>\s*$",
        r"\[TOC\]",
        r"^_footer",
        r"^_header"
    ]

    for line in lines:
        should_skip = False
        for pattern in skip_patterns:
            if re.match(pattern, line.strip()):
                should_skip = True
                break
        if not should_skip:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


async def fetch_all_sources() -> Dict[int, tuple[int, str]]:
    """Fetch articles from all sources"""
    from database import get_all_sources

    sources = await get_all_sources()
    results = {}

    for source in sources:
        count, msg = await fetch_source_articles(source["id"])
        results[source["id"]] = (count, msg)

    return results
