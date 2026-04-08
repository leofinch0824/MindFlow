from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from crawler import fetch_all_sources
import asyncio


scheduler = AsyncIOScheduler()


def init_scheduler():
    """Initialize the scheduler with default jobs"""
    # Default: run at 8:00, 12:00, 18:00 every day
    scheduler.add_job(
        fetch_all_sources_job,
        CronTrigger(hour="8,12,18", minute="0"),
        id="daily_fetch",
        replace_existing=True
    )


async def fetch_all_sources_job():
    """Job wrapper for fetching all sources"""
    print("[Scheduler] 开始定时抓取所有新闻源...")
    try:
        results = await fetch_all_sources()
        for source_id, (count, msg) in results.items():
            print(f"[Scheduler] 源 {source_id}: {msg} ({count} 篇)")
    except Exception as e:
        print(f"[Scheduler] 定时抓取出错: {e}")


def start_scheduler():
    """Start the scheduler"""
    if not scheduler.running:
        init_scheduler()
        scheduler.start()
        print("[Scheduler] 定时任务已启动")


def stop_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("[Scheduler] 定时任务已停止")


def get_jobs():
    """Get all scheduled jobs"""
    return [
        {
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time) if job.next_run_time else None
        }
        for job in scheduler.get_jobs()
    ]


def update_schedule(hours: list[int]):
    """Update the schedule with new hours"""
    scheduler.remove_job("daily_fetch")
    scheduler.add_job(
        fetch_all_sources_job,
        CronTrigger(hour=",".join(str(h) for h in hours), minute="0"),
        id="daily_fetch",
        replace_existing=True
    )
    print(f"[Scheduler] 定时任务已更新为每天 {hours} 点")
