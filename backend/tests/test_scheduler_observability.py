from unittest.mock import AsyncMock, patch

import pytest


class TestSchedulerObservability:
    @pytest.mark.asyncio
    async def test_fetch_all_sources_job_records_partial_summary(self):
        from services.scheduler import fetch_all_sources_job

        fetch_results = {
            1: (4, "抓取成功"),
            2: (0, "抓取失败：timeout"),
        }

        with patch("services.scheduler.create_job_run", new=AsyncMock(return_value=101)) as mock_create_job_run:
            with patch("services.scheduler.finish_job_run_success", new=AsyncMock(return_value=True)) as mock_finish_success:
                with patch("services.scheduler.finish_job_run_failure", new=AsyncMock(return_value=True)) as mock_finish_failure:
                    with patch("services.scheduler.fetch_all_sources", new=AsyncMock(return_value=fetch_results)):
                        await fetch_all_sources_job()

        mock_create_job_run.assert_awaited_once()
        create_kwargs = mock_create_job_run.await_args.kwargs
        assert create_kwargs["job_name"] == "daily_fetch"
        assert create_kwargs["job_type"] == "scheduler"

        mock_finish_failure.assert_not_awaited()
        mock_finish_success.assert_awaited_once()
        finish_kwargs = mock_finish_success.await_args.kwargs
        assert finish_kwargs["status"] == "partial"
        assert finish_kwargs["result_summary"] == {
            "sources_total": 2,
            "sources_succeeded": 1,
            "sources_failed": 1,
            "articles_added": 4,
        }

    @pytest.mark.asyncio
    async def test_generate_digest_job_records_skipped_when_digest_exists(self):
        from services.scheduler import generate_digest_job

        with patch("services.scheduler.create_job_run", new=AsyncMock(return_value=202)) as mock_create_job_run:
            with patch("services.scheduler.finish_job_run_skipped", new=AsyncMock(return_value=True)) as mock_finish_skipped:
                with patch("services.scheduler.finish_job_run_failure", new=AsyncMock(return_value=True)) as mock_finish_failure:
                    with patch("services.scheduler.get_digest_by_date", new=AsyncMock(return_value={"id": 8})):
                        await generate_digest_job()

        mock_create_job_run.assert_awaited_once()
        mock_finish_failure.assert_not_awaited()
        mock_finish_skipped.assert_awaited_once()
        finish_kwargs = mock_finish_skipped.await_args.kwargs
        assert finish_kwargs["skip_reason"] == "digest_exists"
        assert "digest_date" in finish_kwargs["result_summary"]

    @pytest.mark.asyncio
    async def test_we_mp_rss_content_refresh_job_records_success_summary(self):
        from services.scheduler import run_we_mp_rss_content_refresh_job

        with patch("services.scheduler.create_job_run", new=AsyncMock(return_value=303)) as mock_create_job_run:
            with patch("services.scheduler.finish_job_run_success", new=AsyncMock(return_value=True)) as mock_finish_success:
                with patch(
                    "services.scheduler.process_pending_we_mp_rss_articles",
                    new=AsyncMock(return_value={"processed": 1, "detail_fetched": 1, "refresh_failed": 0}),
                ):
                    processed = await run_we_mp_rss_content_refresh_job()

        assert processed == 1
        mock_create_job_run.assert_awaited_once()
        mock_finish_success.assert_awaited_once()
        finish_kwargs = mock_finish_success.await_args.kwargs
        assert finish_kwargs["result_summary"]["processed"] == 1
        assert finish_kwargs["result_summary"]["detail_fetched"] == 1

    @pytest.mark.asyncio
    async def test_anchor_extract_job_records_success_summary(self):
        from services.scheduler import run_anchor_extract_job

        with patch("services.scheduler.create_job_run", new=AsyncMock(return_value=404)) as mock_create_job_run:
            with patch("services.scheduler.finish_job_run_success", new=AsyncMock(return_value=True)) as mock_finish_success:
                with patch(
                    "services.scheduler.extract_anchors_from_recent_articles",
                    new=AsyncMock(return_value={"candidates": 1, "anchors_extracted": 1, "failures": 0, "skipped_existing": 0}),
                ):
                    extracted = await run_anchor_extract_job()

        assert extracted == 1
        mock_create_job_run.assert_awaited_once()
        mock_finish_success.assert_awaited_once()
        finish_kwargs = mock_finish_success.await_args.kwargs
        assert finish_kwargs["result_summary"]["anchors_extracted"] == 1
        assert finish_kwargs["result_summary"]["candidates"] == 1
