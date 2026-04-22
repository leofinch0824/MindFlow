import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services import crawler


WE_MP_RSS_SOURCE = {
    "id": 2,
    "name": "PaperAgent",
    "source_type": "we_mp_rss",
    "api_base_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
    "auth_key": "test-auth-token",
    "config": {
        "feed_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
    },
}

WE_MP_RSS_JSON_FEED = """
{
  "name": "PaperAgent",
  "link": "/feed/MP_WXS_3941633310.json",
  "description": "日更，解读AI前沿技术热点Paper",
  "items": [
    {
      "id": "3941633310-2247506745_1",
      "title": "首篇全新情景认知视角的大模型Agent综述",
      "description": "大家都在谈 Agent",
      "link": "https://mp.weixin.qq.com/s/fa4xzuQoh7uQ2QYczLhHMA",
      "updated": "2026-04-21T17:28:51+08:00",
      "content": "<section><p>feed html content</p></section>"
    }
  ]
}
"""


class TestWeMpRssFeedNormalization:
    def test_normalize_single_channel_feed_url_to_json_and_preserve_query(self):
        from services.we_mprss import normalize_feed_url_for_discovery

        raw_url = "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5&offset=10"

        normalized = normalize_feed_url_for_discovery(raw_url)

        assert normalized == "http://127.0.0.1:8001/feed/MP_WXS_3941633310.json?limit=5&offset=10"


class TestWeMpRssDiscoveryState:
    @pytest.mark.asyncio
    async def test_fetch_source_articles_marks_new_we_mp_rss_entries_waiting_for_refresh(self):
        with patch("services.crawler.get_source_by_id", new=AsyncMock(return_value=WE_MP_RSS_SOURCE)):
            with patch("services.crawler.get_article_by_external_id", new=AsyncMock(return_value=None)):
                with patch("services.crawler.update_source_fetch_time", new=AsyncMock(return_value=None)):
                    with patch("services.crawler.add_fetch_log", new=AsyncMock(return_value=None)):
                        with patch("services.crawler.fetch_feed_document", new=AsyncMock(return_value=(WE_MP_RSS_JSON_FEED, "application/json"))):
                            with patch("services.crawler.create_article", new=AsyncMock(return_value=101)) as mock_create_article:
                                count, message = await crawler.fetch_source_articles(WE_MP_RSS_SOURCE["id"])

        assert count == 1
        assert message == "抓取成功"
        assert mock_create_article.await_count == 1

        create_kwargs = mock_create_article.await_args.kwargs
        assert create_kwargs["external_id"] == "3941633310-2247506745_1"
        assert create_kwargs["content_refresh_status"] == "waiting_for_refresh"
        assert create_kwargs["content_html"] == ""


class TestWeMpRssRefreshLifecycle:
    @pytest.mark.asyncio
    async def test_refresh_lifecycle_backfills_detail_content_after_task_success(self):
        from services.we_mprss import refresh_article_content_and_fetch_detail

        source = {
            "id": 2,
            "source_type": "we_mp_rss",
            "api_base_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
            "auth_key": "test-auth-token",
        }
        article = {
            "id": 101,
            "external_id": "3941633310-2247506745_1",
            "content_refresh_status": "waiting_for_refresh",
        }

        request_refresh = AsyncMock(return_value={"task_id": "task-123", "status": "pending"})
        poll_status = AsyncMock(side_effect=[{"status": "running"}, {"status": "success"}])
        fetch_detail = AsyncMock(
            return_value={
                "article_id": "3941633310-2247506745_1",
                "title": "首篇全新情景认知视角的大模型Agent综述",
                "description": "文章摘要",
                "content": "<div>fallback content</div>",
                "content_html": "<article><p>full content</p></article>",
            }
        )

        result = await refresh_article_content_and_fetch_detail(
            source=source,
            article=article,
            request_refresh=request_refresh,
            poll_refresh_task=poll_status,
            fetch_article_detail=fetch_detail,
        )

        assert result["content_refresh_status"] == "detail_fetched"
        assert result["content_refresh_task_id"] == "task-123"
        assert result["content_html"] == "<article><p>full content</p></article>"
        assert "full content" in result["content"]

    @pytest.mark.asyncio
    async def test_refresh_lifecycle_returns_refresh_failed_when_remote_refresh_errors(self):
        from services.we_mprss import refresh_article_content_and_fetch_detail

        source = {
            "id": 2,
            "source_type": "we_mp_rss",
            "api_base_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
            "auth_key": "bad-token",
        }
        article = {
            "id": 101,
            "external_id": "3941633310-2247506745_1",
            "content_refresh_status": "waiting_for_refresh",
        }

        request_refresh = AsyncMock(side_effect=RuntimeError("401 unauthorized"))

        result = await refresh_article_content_and_fetch_detail(
            source=source,
            article=article,
            request_refresh=request_refresh,
        )

        assert result["content_refresh_status"] == "refresh_failed"
        assert "401 unauthorized" in result["content_refresh_error"]

    @pytest.mark.asyncio
    async def test_refresh_lifecycle_falls_back_to_detail_when_task_poll_errors(self):
        from services.we_mprss import refresh_article_content_and_fetch_detail

        source = {
            "id": 2,
            "source_type": "we_mp_rss",
            "api_base_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
            "auth_key": "test-auth-token",
        }
        article = {
            "id": 101,
            "external_id": "3941633310-2247506745_1",
            "content_refresh_status": "waiting_for_refresh",
        }

        request_refresh = AsyncMock(return_value={"task_id": "task-123", "status": "pending"})
        poll_status = AsyncMock(side_effect=RuntimeError("404 task missing"))
        fetch_detail = AsyncMock(
            return_value={
                "article_id": "3941633310-2247506745_1",
                "title": "首篇全新情景认知视角的大模型Agent综述",
                "description": "文章摘要",
                "content": "<div>fallback content</div>",
                "content_html": "<article><p>full content</p></article>",
            }
        )

        result = await refresh_article_content_and_fetch_detail(
            source=source,
            article=article,
            request_refresh=request_refresh,
            poll_refresh_task=poll_status,
            fetch_article_detail=fetch_detail,
        )

        assert result["content_refresh_status"] == "detail_fetched"
        assert result["content_html"] == "<article><p>full content</p></article>"

    @pytest.mark.asyncio
    async def test_refresh_lifecycle_falls_back_to_detail_when_task_reports_failed(self):
        from services.we_mprss import refresh_article_content_and_fetch_detail

        source = {
            "id": 2,
            "source_type": "we_mp_rss",
            "api_base_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
            "auth_key": "test-auth-token",
        }
        article = {
            "id": 101,
            "external_id": "3941633310-2247506745_1",
            "content_refresh_status": "waiting_for_refresh",
        }

        request_refresh = AsyncMock(return_value={"task_id": "task-123", "status": "pending"})
        poll_status = AsyncMock(return_value={"status": "failed", "error": "browser launch failed"})
        fetch_detail = AsyncMock(
            return_value={
                "article_id": "3941633310-2247506745_1",
                "title": "首篇全新情景认知视角的大模型Agent综述",
                "description": "文章摘要",
                "content": "<div>fallback content</div>",
                "content_html": "<article><p>full content</p></article>",
            }
        )

        result = await refresh_article_content_and_fetch_detail(
            source=source,
            article=article,
            request_refresh=request_refresh,
            poll_refresh_task=poll_status,
            fetch_article_detail=fetch_detail,
        )

        assert result["content_refresh_status"] == "detail_fetched"
        assert result["content_html"] == "<article><p>full content</p></article>"


class TestSchedulerRefreshLoop:
    @pytest.mark.asyncio
    async def test_process_pending_we_mp_rss_articles_requests_refresh_and_persists_backfill(self):
        from services.scheduler import process_pending_we_mp_rss_articles

        due_articles = [
            {
                "article_id": 101,
                "source_id": 2,
                "external_id": "3941633310-2247506745_1",
                "api_base_url": "http://127.0.0.1:8001/feed/MP_WXS_3941633310.rss?limit=5",
                "auth_key": "test-auth-token",
                "source_type": "we_mp_rss",
                "content_refresh_status": "waiting_for_refresh",
            }
        ]
        refresh_result = {
            "content_refresh_status": "detail_fetched",
            "content_refresh_task_id": "task-123",
            "content_html": "<article><p>full content</p></article>",
            "content": "full content",
            "content_refresh_error": None,
        }

        with patch("services.scheduler.get_articles_due_for_content_refresh", new=AsyncMock(return_value=due_articles)):
            with patch("services.scheduler.refresh_article_content_and_fetch_detail", new=AsyncMock(return_value=refresh_result)):
                with patch("services.scheduler.update_article_content_refresh", new=AsyncMock(return_value=True)) as mock_update:
                    processed = await process_pending_we_mp_rss_articles()

        assert processed == 1
        mock_update.assert_awaited_once_with(101, **refresh_result)

    @pytest.mark.asyncio
    async def test_extract_anchors_only_uses_content_ready_articles(self):
        from services.scheduler import extract_anchors_from_recent_articles

        ready_articles = [
            {
                "article_id": 201,
                "title": "Ready article",
                "content": "full content",
                "summary": "",
                "link": "https://example.com/article",
                "source_name": "PaperAgent",
            }
        ]
        anchor_payload = {
            "title": "Ready anchor",
            "content": "Anchor content",
            "dialectical_analysis": "【支持】x【质疑】y【延伸】z",
            "anchor_type": "opinion",
            "significance": 0.8,
            "source_article_title": "Ready article",
            "source_article_link": "https://example.com/article",
            "source_name": "PaperAgent",
            "tags": ["agent"],
            "related_tag_weights": {"agent": 0.8},
        }

        with patch("services.scheduler.get_articles_ready_for_anchor_extraction", new=AsyncMock(return_value=ready_articles)):
            with patch("services.scheduler.get_anchors_by_article", new=AsyncMock(return_value=[])):
                with patch("services.scheduler.extract_anchor", new=AsyncMock(return_value=anchor_payload)):
                    with patch("services.scheduler.create_anchor", new=AsyncMock(return_value=1)) as mock_create_anchor:
                        extracted = await extract_anchors_from_recent_articles()

        assert extracted == 1
        mock_create_anchor.assert_awaited_once()
