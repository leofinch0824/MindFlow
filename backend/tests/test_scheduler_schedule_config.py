from apscheduler.triggers.combining import OrTrigger
from unittest.mock import AsyncMock, patch

import pytest


def test_parse_schedule_times_sorts_and_deduplicates():
    from services.scheduler import parse_schedule_times

    assert parse_schedule_times(["23:30", "08:00", "12:00", "08:00"]) == [
        "08:00",
        "12:00",
        "23:30",
    ]


def test_parse_schedule_times_rejects_invalid_values():
    from services.scheduler import parse_schedule_times

    try:
        parse_schedule_times(["08:00", "24:00"])
    except ValueError as exc:
        assert "HH:mm" in str(exc)
    else:
        raise AssertionError("expected ValueError for invalid time")


def test_build_daily_fetch_trigger_supports_minute_precision():
    from services.scheduler import _build_daily_fetch_trigger

    trigger = _build_daily_fetch_trigger(["08:00", "12:15", "23:30"])

    assert isinstance(trigger, OrTrigger)
    cron_parts = {(item.fields[5].expressions[0].first, item.fields[6].expressions[0].first) for item in trigger.triggers}
    assert cron_parts == {(8, 0), (12, 15), (23, 30)}


@pytest.mark.asyncio
async def test_load_persisted_fetch_schedule_reads_stored_times():
    from services.scheduler import load_persisted_fetch_schedule

    with patch("services.scheduler.get_schedule_config", new=AsyncMock(return_value={"fetch_times": ["07:45", "23:30"]})):
        times = await load_persisted_fetch_schedule()

    assert times == ["07:45", "23:30"]


@pytest.mark.asyncio
async def test_load_persisted_fetch_schedule_seeds_defaults_when_missing():
    from services.scheduler import load_persisted_fetch_schedule

    with patch("services.scheduler.get_schedule_config", new=AsyncMock(return_value={})):
        with patch("services.scheduler.update_schedule_config", new=AsyncMock(return_value={"fetch_times": ["08:00", "12:00", "18:00", "23:30"]})) as mock_update:
            times = await load_persisted_fetch_schedule()

    assert times == ["08:00", "12:00", "18:00", "23:30"]
    mock_update.assert_awaited_once_with(["08:00", "12:00", "18:00", "23:30"])
