import os
import socket
from uuid import uuid4

import pytest
import pytest_asyncio


def _postgres_available() -> bool:
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


pytestmark = pytest.mark.skipif(
    not _postgres_available(),
    reason="PostgreSQL not available - run after docker-compose up -d postgres",
)


@pytest_asyncio.fixture
async def setup_database():
    from database import async_engine, init_db

    await async_engine.dispose()
    await init_db()
    yield
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_job_run_lifecycle_crud(setup_database):
    from database import create_job_run, finish_job_run_success, get_latest_job_runs

    job_name = f"pytest_job_run_success_{uuid4().hex}"
    job_run_id = await create_job_run(
        job_name=job_name,
        job_type="scheduler",
        trigger_source="cron",
        payload={"target_date": "2026-04-23"},
    )

    assert job_run_id > 0

    finished = await finish_job_run_success(
        job_run_id,
        result_summary={
            "articles_added": 4,
            "anchors_extracted": 2,
        },
    )
    assert finished is True

    latest_runs = await get_latest_job_runs([job_name])
    assert job_name in latest_runs
    assert latest_runs[job_name]["status"] == "success"
    assert latest_runs[job_name]["result_summary"]["articles_added"] == 4
    assert latest_runs[job_name]["finished_at"] is not None


@pytest.mark.asyncio
async def test_job_run_failure_and_latest_selection(setup_database):
    from database import (
        create_job_run,
        finish_job_run_failure,
        finish_job_run_success,
        get_latest_job_runs,
    )

    job_name = f"pytest_job_run_failure_{uuid4().hex}"

    first_run_id = await create_job_run(
        job_name=job_name,
        job_type="scheduler",
        trigger_source="manual",
        payload={"target_date": "2026-04-22"},
    )
    await finish_job_run_failure(first_run_id, error_message="digest generation failed")

    second_run_id = await create_job_run(
        job_name=job_name,
        job_type="scheduler",
        trigger_source="cron",
        payload={"target_date": "2026-04-23"},
    )
    await finish_job_run_success(
        second_run_id,
        result_summary={"digest_id": 99},
        status="partial",
    )

    latest_runs = await get_latest_job_runs([job_name])
    assert latest_runs[job_name]["id"] == second_run_id
    assert latest_runs[job_name]["status"] == "partial"
    assert latest_runs[job_name]["result_summary"]["digest_id"] == 99


@pytest.mark.asyncio
async def test_schedule_config_persists_fetch_times(setup_database):
    from database import get_schedule_config, update_schedule_config

    saved = await update_schedule_config(["08:00", "12:00", "18:00", "23:30"])
    assert saved["fetch_times"] == ["08:00", "12:00", "18:00", "23:30"]

    loaded = await get_schedule_config()
    assert loaded["fetch_times"] == ["08:00", "12:00", "18:00", "23:30"]
