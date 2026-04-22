import asyncio
import html
import json
import re
from datetime import datetime
from typing import Any, Awaitable, Callable, Dict, Optional
from urllib.parse import ParseResult, parse_qsl, urlencode, urlparse, urlunparse

import httpx


WE_MPRSS_SOURCE_TYPE = "we_mp_rss"
WE_MPRSS_FEED_PATH_RE = re.compile(r"^/feed/(?P<feed_id>[^/]+?)\.(?P<ext>rss|xml|atom|json)$", re.IGNORECASE)
DEFAULT_REFRESH_TIMEOUT_SECONDS = 30


def is_we_mprss_feed_url(raw_url: str) -> bool:
    parsed = urlparse(raw_url)
    return bool(WE_MPRSS_FEED_PATH_RE.match(parsed.path))


def normalize_feed_url_for_discovery(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    match = WE_MPRSS_FEED_PATH_RE.match(parsed.path)
    if not match:
        return raw_url

    feed_id = match.group("feed_id")
    normalized_path = f"/feed/{feed_id}.json"
    normalized_query = urlencode(parse_qsl(parsed.query, keep_blank_values=True))
    normalized = ParseResult(
        scheme=parsed.scheme,
        netloc=parsed.netloc,
        path=normalized_path,
        params=parsed.params,
        query=normalized_query,
        fragment=parsed.fragment,
    )
    return urlunparse(normalized)


def get_service_base_url(feed_url: str) -> str:
    parsed = urlparse(feed_url)
    return f"{parsed.scheme}://{parsed.netloc}"


def build_auth_headers(auth_key: str) -> Dict[str, str]:
    key = (auth_key or "").strip()
    if not key:
        return {}
    return {
        "Authorization": f"Bearer {key}",
        "X-Auth-Key": key,
    }


def choose_detail_html(detail: Dict[str, Any]) -> str:
    html_content = str(detail.get("content_html") or "").strip()
    if html_content:
        return html_content
    return str(detail.get("content") or "").strip()


def html_to_text(content: str) -> str:
    if not content:
        return ""
    normalized = re.sub(r"(?i)<br\\s*/?>", "\n", content)
    normalized = re.sub(r"(?i)</p\\s*>", "\n\n", normalized)
    normalized = re.sub(r"(?i)</div\\s*>", "\n", normalized)
    normalized = re.sub(r"(?is)<script.*?</script>", "", normalized)
    normalized = re.sub(r"(?is)<style.*?</style>", "", normalized)
    normalized = re.sub(r"(?s)<[^>]+>", "", normalized)
    normalized = html.unescape(normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    return normalized.strip()


def _build_detail_fetched_payload(
    *,
    task_id: str,
    requested_at: datetime,
    detail: Dict[str, Any],
    article: Dict[str, Any],
    error_message: Optional[str] = None,
) -> Dict[str, Any]:
    html_content = choose_detail_html(detail)
    return {
        "content_refresh_status": "detail_fetched",
        "content_refresh_task_id": task_id or None,
        "content_refresh_requested_at": requested_at,
        "content_refresh_checked_at": datetime.utcnow(),
        "content_refreshed_at": datetime.utcnow(),
        "content_refresh_error": error_message,
        "content_html": html_content,
        "content": html_to_text(html_content) or detail.get("description") or article.get("content") or "",
    }


async def _request_json(
    method: str,
    url: str,
    *,
    auth_key: str = "",
    timeout_seconds: int = DEFAULT_REFRESH_TIMEOUT_SECONDS,
) -> Dict[str, Any]:
    headers = build_auth_headers(auth_key)
    async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
        response = await client.request(method, url, headers=headers)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("we-mp-rss API did not return a JSON object")
    return payload


async def request_article_refresh(source: Dict[str, Any], article_id: str) -> Dict[str, Any]:
    payload = await _request_json(
        "POST",
        f"{get_service_base_url(source['api_base_url'])}/api/v1/wx/articles/{article_id}/refresh",
        auth_key=source.get("auth_key", ""),
    )
    data = payload.get("data") or payload
    return {
        "task_id": str(data.get("task_id") or ""),
        "article_id": str(data.get("article_id") or article_id),
        "status": str(data.get("status") or "pending"),
    }


async def poll_refresh_task(source: Dict[str, Any], task_id: str) -> Dict[str, Any]:
    payload = await _request_json(
        "GET",
        f"{get_service_base_url(source['api_base_url'])}/api/v1/wx/articles/refresh/tasks/{task_id}",
        auth_key=source.get("auth_key", ""),
    )
    data = payload.get("data") or payload
    return {
        "task_id": str(data.get("task_id") or task_id),
        "status": str(data.get("status") or "pending"),
        "error": str(data.get("error") or data.get("message") or "").strip(),
    }


async def fetch_article_detail(source: Dict[str, Any], article_id: str) -> Dict[str, Any]:
    payload = await _request_json(
        "GET",
        f"{get_service_base_url(source['api_base_url'])}/api/v1/wx/articles/{article_id}",
        auth_key=source.get("auth_key", ""),
    )
    data = payload.get("data") or payload
    return {
        "article_id": str(data.get("id") or article_id),
        "title": str(data.get("title") or "").strip(),
        "description": str(data.get("description") or "").strip(),
        "url": str(data.get("url") or "").strip(),
        "content": str(data.get("content") or "").strip(),
        "content_html": str(data.get("content_html") or "").strip(),
        "has_content": data.get("has_content"),
        "publish_time": data.get("publish_time"),
    }


async def refresh_article_content_and_fetch_detail(
    *,
    source: Dict[str, Any],
    article: Dict[str, Any],
    request_refresh: Callable[[Dict[str, Any], str], Awaitable[Dict[str, Any]]] = request_article_refresh,
    poll_refresh_task: Callable[[Dict[str, Any], str], Awaitable[Dict[str, Any]]] = poll_refresh_task,
    fetch_article_detail: Callable[[Dict[str, Any], str], Awaitable[Dict[str, Any]]] = fetch_article_detail,
    timeout_seconds: int = 180,
    poll_interval_seconds: float = 0.0,
) -> Dict[str, Any]:
    auth_key = (source.get("auth_key") or "").strip()
    article_id = str(article.get("external_id") or "").strip()

    if not auth_key:
        return {
            "content_refresh_status": "refresh_failed",
            "content_refresh_error": "we-mp-rss auth_key is required for protected refresh APIs",
        }

    if not article_id:
        return {
            "content_refresh_status": "refresh_failed",
            "content_refresh_error": "article external_id is required for we-mp-rss refresh",
        }

    requested_at = datetime.utcnow()
    task_id = ""

    try:
        refresh_response = await request_refresh(source, article_id)
        task_id = str(refresh_response.get("task_id") or "").strip()
        if not task_id:
            return {
                "content_refresh_status": "refresh_failed",
                "content_refresh_error": "we-mp-rss refresh response missing task_id",
            }

        deadline = requested_at.timestamp() + timeout_seconds

        while True:
            task_status = await poll_refresh_task(source, task_id)
            status = str(task_status.get("status") or "pending").strip().lower()

            if status == "success":
                detail = await fetch_article_detail(source, article_id)
                return _build_detail_fetched_payload(
                    task_id=task_id,
                    requested_at=requested_at,
                    detail=detail,
                    article=article,
                )

            if status == "failed":
                detail = await fetch_article_detail(source, article_id)
                if choose_detail_html(detail):
                    return _build_detail_fetched_payload(
                        task_id=task_id,
                        requested_at=requested_at,
                        detail=detail,
                        article=article,
                        error_message=task_status.get("error") or "we-mp-rss refresh task failed",
                    )
                return {
                    "content_refresh_status": "refresh_failed",
                    "content_refresh_task_id": task_id,
                    "content_refresh_requested_at": requested_at,
                    "content_refresh_checked_at": datetime.utcnow(),
                    "content_refresh_error": task_status.get("error") or "we-mp-rss refresh task failed",
                }

            if datetime.utcnow().timestamp() >= deadline:
                return {
                    "content_refresh_status": "refresh_failed",
                    "content_refresh_task_id": task_id,
                    "content_refresh_requested_at": requested_at,
                    "content_refresh_checked_at": datetime.utcnow(),
                    "content_refresh_error": "we-mp-rss refresh task timed out",
                }

            if poll_interval_seconds > 0:
                await asyncio.sleep(poll_interval_seconds)
    except Exception as exc:
        if task_id:
            try:
                detail = await fetch_article_detail(source, article_id)
                if choose_detail_html(detail):
                    return _build_detail_fetched_payload(
                        task_id=task_id,
                        requested_at=requested_at,
                        detail=detail,
                        article=article,
                        error_message=str(exc),
                    )
            except Exception:
                pass
        return {
            "content_refresh_status": "refresh_failed",
            "content_refresh_task_id": task_id or None,
            "content_refresh_requested_at": requested_at,
            "content_refresh_checked_at": datetime.utcnow(),
            "content_refresh_error": str(exc),
        }
