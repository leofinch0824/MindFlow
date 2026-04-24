import datetime as dt
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.combining import OrTrigger
from apscheduler.triggers.cron import CronTrigger

from database import (
    create_anchor,
    create_digest,
    create_job_run,
    finish_job_run_failure,
    finish_job_run_skipped,
    finish_job_run_success,
    get_all_anchors_for_digest,
    get_articles_due_for_content_refresh,
    get_articles_ready_for_anchor_extraction,
    get_anchors_by_article,
    get_digest_by_date,
    get_schedule_config,
    update_schedule_config,
    update_article_content_refresh,
    update_source_auth_state,
)
from services.ai import extract_anchor, synthesize_digest
from services.crawler import fetch_all_sources
from services.we_mprss import refresh_article_content_and_fetch_detail


DEFAULT_BUSINESS_TIMEZONE = "Asia/Shanghai"
DEFAULT_REFRESH_DELAY_MINUTES = 5
DEFAULT_FETCH_TIMES = ["08:00", "12:00", "18:00", "23:30"]
DEFAULT_REFRESH_JOB_HOUR = 0
DEFAULT_REFRESH_JOB_MINUTE = 10
DEFAULT_ANCHOR_JOB_HOUR = 0
DEFAULT_ANCHOR_JOB_MINUTE = 40
DEFAULT_DIGEST_JOB_HOUR = 9
DEFAULT_DIGEST_JOB_MINUTE = 0

scheduler = AsyncIOScheduler(timezone=ZoneInfo(DEFAULT_BUSINESS_TIMEZONE))
configured_fetch_times = list(DEFAULT_FETCH_TIMES)


def _business_timezone() -> ZoneInfo:
    return ZoneInfo(DEFAULT_BUSINESS_TIMEZONE)


def get_business_now(now: dt.datetime | None = None) -> dt.datetime:
    zone = _business_timezone()
    if now is None:
        return dt.datetime.now(zone)
    if now.tzinfo is None:
        return now.replace(tzinfo=zone)
    return now.astimezone(zone)


def get_digest_target_date(now: dt.datetime | None = None) -> dt.date:
    return (get_business_now(now) - dt.timedelta(days=1)).date()


def get_business_day_range(target_date: dt.date) -> tuple[dt.datetime, dt.datetime]:
    zone = _business_timezone()
    start_local = dt.datetime.combine(target_date, dt.time.min, tzinfo=zone)
    end_local = start_local + dt.timedelta(days=1)
    start_utc = start_local.astimezone(dt.timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(dt.timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc


def parse_schedule_times(times: list[str] | None) -> list[str]:
    if not times:
        return []

    normalized = []
    for raw_value in times:
        value = (raw_value or "").strip()
        parts = value.split(":")
        if (
            len(parts) != 2
            or len(parts[0]) != 2
            or len(parts[1]) != 2
            or not all(part.isdigit() for part in parts)
        ):
            raise ValueError("schedule times must use HH:mm format")

        hour = int(parts[0])
        minute = int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("schedule times must use HH:mm format")
        normalized.append(f"{hour:02d}:{minute:02d}")

    return sorted(set(normalized))


def _build_daily_fetch_trigger(times: list[str] | None = None):
    zone = _business_timezone()
    selected_times = parse_schedule_times(times or configured_fetch_times)
    triggers = []

    for schedule_time in selected_times:
        hour_str, minute_str = schedule_time.split(":")
        triggers.append(
            CronTrigger(
                hour=hour_str,
                minute=minute_str,
                timezone=zone,
            )
        )

    if len(triggers) == 1:
        return triggers[0]
    return OrTrigger(triggers)


def init_scheduler():
    """Initialize scheduler jobs with the current default cadence."""
    zone = _business_timezone()

    scheduler.add_job(
        fetch_all_sources_job,
        _build_daily_fetch_trigger(),
        id="daily_fetch",
        replace_existing=True,
    )

    scheduler.add_job(
        run_we_mp_rss_content_refresh_job,
        CronTrigger(hour=str(DEFAULT_REFRESH_JOB_HOUR), minute=str(DEFAULT_REFRESH_JOB_MINUTE), timezone=zone),
        id="we_mp_rss_content_refresh",
        replace_existing=True,
    )

    scheduler.add_job(
        run_anchor_extract_job,
        CronTrigger(hour=str(DEFAULT_ANCHOR_JOB_HOUR), minute=str(DEFAULT_ANCHOR_JOB_MINUTE), timezone=zone),
        id="anchor_extract",
        replace_existing=True,
    )

    scheduler.add_job(
        generate_digest_job,
        CronTrigger(hour=str(DEFAULT_DIGEST_JOB_HOUR), minute=str(DEFAULT_DIGEST_JOB_MINUTE), timezone=zone),
        id="daily_digest",
        replace_existing=True,
    )


def _is_fetch_failure(message: str) -> bool:
    normalized = (message or "").strip().lower()
    return "失败" in normalized or "error" in normalized or "exception" in normalized


async def process_pending_we_mp_rss_articles(
    *,
    target_date: dt.date | None = None,
    delay_minutes: int = DEFAULT_REFRESH_DELAY_MINUTES,
    limit: int = 20,
    return_summary: bool = False,
):
    """Refresh due we-mp-rss articles and persist backfilled content."""
    fetched_after = None
    fetched_before = None
    if target_date is not None:
        fetched_after, fetched_before = get_business_day_range(target_date)

    due_articles = await get_articles_due_for_content_refresh(
        delay_minutes=delay_minutes,
        limit=limit,
        fetched_after=fetched_after,
        fetched_before=fetched_before,
    )
    processed = 0
    detail_fetched = 0
    refresh_failed = 0
    source_updates = 0

    for row in due_articles:
        source = {
            "id": row.get("source_id"),
            "source_type": row.get("source_type"),
            "api_base_url": row.get("api_base_url"),
            "auth_key": row.get("auth_key"),
            "config": row.get("source_config") or {},
        }
        article = {
            "id": row.get("article_id"),
            "provider_article_id": row.get("provider_article_id"),
            "external_id": row.get("external_id"),
            "content_refresh_status": row.get("content_refresh_status"),
        }

        refresh_result = await refresh_article_content_and_fetch_detail(
            source=source,
            article=article,
            poll_interval_seconds=1.0,
        )
        article_update = dict(refresh_result)
        source_update = article_update.pop("source_update", None)
        if isinstance(source_update, dict):
            await update_source_auth_state(
                row["source_id"],
                auth_key=source_update.get("auth_key") or "",
                config=source_update.get("config") or {},
            )
            source_updates += 1

        await update_article_content_refresh(row["article_id"], **article_update)
        status = article_update.get("content_refresh_status")
        if status == "detail_fetched":
            detail_fetched += 1
        elif status == "refresh_failed":
            refresh_failed += 1
        processed += 1

    if return_summary:
        return {
            "processed": processed,
            "detail_fetched": detail_fetched,
            "refresh_failed": refresh_failed,
            "source_updates": source_updates,
        }
    return processed


async def extract_anchors_from_recent_articles(
    *,
    target_date: dt.date | None = None,
    limit: int = 50,
    return_summary: bool = False,
):
    """Extract anchors from content-ready articles."""
    fetched_after = None
    fetched_before = None
    if target_date is not None:
        fetched_after, fetched_before = get_business_day_range(target_date)

    articles = await get_articles_ready_for_anchor_extraction(
        limit=limit,
        fetched_after=fetched_after,
        fetched_before=fetched_before,
    )
    print(f"[Scheduler] 找到 {len(articles)} 篇可提锚点文章，开始提取锚点...")
    extracted = 0
    failures = 0
    skipped_existing = 0

    for article in articles:
        article_id = article["article_id"]
        existing = await get_anchors_by_article(article_id)
        if existing:
            skipped_existing += 1
            continue

        try:
            anchor_data = await extract_anchor(
                title=article["title"],
                content=article.get("content", "") or article.get("summary", ""),
                article_link=article.get("link", ""),
                source_name=article.get("source_name", ""),
            )
            await create_anchor(
                article_id=article_id,
                title=anchor_data["title"],
                content=anchor_data["content"],
                dialectical_analysis=anchor_data["dialectical_analysis"],
                anchor_type=anchor_data.get("anchor_type", "opinion"),
                significance=anchor_data.get("significance", 0.5),
                source_article_title=anchor_data.get("source_article_title", article["title"]),
                source_article_link=anchor_data.get("source_article_link", article.get("link", "")),
                source_name=anchor_data.get("source_name", article.get("source_name", "")),
                tags=anchor_data.get("tags", []),
                related_tag_weights=anchor_data.get("related_tag_weights", {}),
            )
            print(f"[Scheduler] 文章 {article_id} 锚点提取成功: {anchor_data['title'][:30]}")
            extracted += 1
        except Exception as exc:
            print(f"[Scheduler] 锚点提取失败 (article {article_id}): {exc}")
            failures += 1

    if return_summary:
        return {
            "candidates": len(articles),
            "anchors_extracted": extracted,
            "skipped_existing": skipped_existing,
            "failures": failures,
        }
    return extracted


async def fetch_all_sources_job():
    """Scheduled wrapper for source fetches only."""
    job_run_id = await create_job_run(
        job_name="daily_fetch",
        job_type="scheduler",
        trigger_source="cron",
        payload={
            "schedule": list(configured_fetch_times),
        },
    )
    print("[Scheduler] 开始定时抓取所有新闻源...")
    try:
        results = await fetch_all_sources()
        sources_total = len(results)
        sources_failed = sum(1 for _, (_, message) in results.items() if _is_fetch_failure(message))
        sources_succeeded = sources_total - sources_failed
        articles_added = sum(max(count, 0) for count, _ in results.values())

        for source_id, (count, msg) in results.items():
            print(f"[Scheduler] 源 {source_id}: {msg} ({count} 篇)")

        summary = {
            "sources_total": sources_total,
            "sources_succeeded": sources_succeeded,
            "sources_failed": sources_failed,
            "articles_added": articles_added,
        }
        status = "success" if sources_failed == 0 else "partial"
        await finish_job_run_success(job_run_id, result_summary=summary, status=status)
        return summary
    except Exception as exc:
        await finish_job_run_failure(job_run_id, error_message=str(exc))
        print(f"[Scheduler] 定时抓取任务出错: {exc}")
        raise


async def run_we_mp_rss_content_refresh_job(target_date: dt.date | None = None):
    """Scheduled wrapper for daily we-mp-rss content backfill."""
    effective_target_date = target_date or get_digest_target_date()
    job_run_id = await create_job_run(
        job_name="we_mp_rss_content_refresh",
        job_type="scheduler",
        trigger_source="cron",
        payload={
            "target_article_date": effective_target_date.isoformat(),
            "delay_minutes": DEFAULT_REFRESH_DELAY_MINUTES,
        },
    )

    try:
        summary = await process_pending_we_mp_rss_articles(
            target_date=effective_target_date,
            delay_minutes=DEFAULT_REFRESH_DELAY_MINUTES,
            return_summary=True,
        )
        summary["target_article_date"] = effective_target_date.isoformat()
        status = "success" if summary.get("refresh_failed", 0) == 0 else "partial"
        await finish_job_run_success(job_run_id, result_summary=summary, status=status)
        return summary.get("processed", 0)
    except Exception as exc:
        await finish_job_run_failure(
            job_run_id,
            error_message=str(exc),
            result_summary={"target_article_date": effective_target_date.isoformat()},
        )
        raise


async def run_anchor_extract_job(target_date: dt.date | None = None):
    """Scheduled wrapper for batch anchor extraction."""
    effective_target_date = target_date or get_digest_target_date()
    job_run_id = await create_job_run(
        job_name="anchor_extract",
        job_type="scheduler",
        trigger_source="cron",
        payload={"target_article_date": effective_target_date.isoformat()},
    )

    try:
        summary = await extract_anchors_from_recent_articles(
            target_date=effective_target_date,
            return_summary=True,
        )
        summary["target_article_date"] = effective_target_date.isoformat()
        status = "success" if summary.get("failures", 0) == 0 else "partial"
        await finish_job_run_success(job_run_id, result_summary=summary, status=status)
        return summary.get("anchors_extracted", 0)
    except Exception as exc:
        await finish_job_run_failure(
            job_run_id,
            error_message=str(exc),
            result_summary={"target_article_date": effective_target_date.isoformat()},
        )
        raise


async def generate_digest_job(target_date: dt.date | None = None):
    """Scheduled wrapper for generating the daily digest from the previous day's articles."""
    effective_target_date = target_date or get_digest_target_date()
    date_str = effective_target_date.isoformat()
    start_at, end_at = get_business_day_range(effective_target_date)

    job_run_id = await create_job_run(
        job_name="daily_digest",
        job_type="scheduler",
        trigger_source="cron",
        payload={"target_article_date": date_str},
    )
    print(f"[Scheduler] 开始生成 {date_str} 简报...")

    try:
        existing = await get_digest_by_date(date_str)
        if existing:
            await finish_job_run_skipped(
                job_run_id,
                skip_reason="digest_exists",
                result_summary={"digest_date": date_str, "target_article_date": date_str},
            )
            print(f"[Scheduler] {date_str} 简报已存在，跳过")
            return None

        anchors = await get_all_anchors_for_digest(
            article_fetched_after=start_at,
            article_fetched_before=end_at,
        )
        if not anchors:
            await finish_job_run_skipped(
                job_run_id,
                skip_reason="no_anchors",
                result_summary={"digest_date": date_str, "target_article_date": date_str, "anchor_count": 0},
            )
            print("[Scheduler] 暂无锚点数据，简报生成取消")
            return None

        digest_data = await synthesize_digest(anchors)
        article_ids = set(anchor["article_id"] for anchor in anchors)
        total_articles = len(article_ids)

        digest_id = await create_digest(
            date_str=date_str,
            title=f"{date_str} 昨日资讯",
            overview=digest_data.get("overview", ""),
            sections=digest_data.get("sections", []),
            total_articles=total_articles,
            anchor_count=len(anchors),
        )

        summary = {
            "digest_date": date_str,
            "target_article_date": date_str,
            "anchor_count": len(anchors),
            "total_articles": total_articles,
            "digest_id": digest_id,
        }
        await finish_job_run_success(job_run_id, result_summary=summary)
        print(f"[Scheduler] 简报生成成功 (id={digest_id})")
        return digest_id
    except Exception as exc:
        await finish_job_run_failure(
            job_run_id,
            error_message=str(exc),
            result_summary={"digest_date": date_str, "target_article_date": date_str},
        )
        print(f"[Scheduler] 简报生成失败: {exc}")
        raise


def start_scheduler():
    """Start the scheduler."""
    if not scheduler.running:
        init_scheduler()
        scheduler.start()
        print("[Scheduler] 定时任务已启动")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        print("[Scheduler] 定时任务已停止")


def get_jobs():
    """Get all scheduled jobs."""
    return [
        {
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time) if job.next_run_time else None,
        }
        for job in scheduler.get_jobs()
    ]


def get_fetch_schedule_times() -> list[str]:
    """Get the current configured fetch times in HH:mm format."""
    return list(configured_fetch_times)


async def load_persisted_fetch_schedule() -> list[str]:
    """Load persisted schedule config or seed defaults if no row exists yet."""
    global configured_fetch_times

    persisted = await get_schedule_config()
    stored_times = persisted.get("fetch_times") if persisted else None

    if stored_times:
        configured_fetch_times = parse_schedule_times(stored_times)
        return list(configured_fetch_times)

    configured_fetch_times = parse_schedule_times(DEFAULT_FETCH_TIMES)
    await update_schedule_config(configured_fetch_times)
    return list(configured_fetch_times)


def update_schedule(times: list[str]):
    """Update the daily fetch schedule with minute precision."""
    global configured_fetch_times
    normalized_times = parse_schedule_times(times)
    if not normalized_times:
        raise ValueError("schedule times must not be empty")

    configured_fetch_times = normalized_times
    scheduler.remove_job("daily_fetch")
    scheduler.add_job(
        fetch_all_sources_job,
        _build_daily_fetch_trigger(normalized_times),
        id="daily_fetch",
        replace_existing=True,
    )
    print(f"[Scheduler] 定时任务已更新为每天 {', '.join(normalized_times)}")
