from fastapi import APIRouter, HTTPException
from schemas import (
    AIConfigUpdate,
    AIConfigResponse,
    AIConfigSaveResponse,
    AIConfigTestRequest,
    AIConfigTestResponse,
    ScheduleConfigResponse,
    ScheduleUpdateRequest,
)
from database import get_ai_config, get_latest_job_runs, get_schedule_config, update_ai_config, update_schedule_config
from services.ai import test_ai_connection
from services.scheduler import get_fetch_schedule_times, get_jobs, parse_schedule_times, update_schedule
from typing import Optional, Tuple

router = APIRouter(prefix="/api/config", tags=["系统配置"])

DEFAULT_PROVIDER = "siliconflow"
DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1"
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"


def _format_updated_at(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _resolve_api_key(
    draft_api_key: Optional[str],
    stored_config: Optional[dict],
    allow_stored_fallback: bool = True
) -> Tuple[Optional[str], bool]:
    normalized = (draft_api_key or "").strip()
    if normalized:
        return normalized, False

    if allow_stored_fallback and stored_config and stored_config.get("api_key"):
        return stored_config["api_key"], True

    return None, False


def _resolve_draft_value(
    draft_value: Optional[str],
    stored_value: Optional[str],
    default_value: str,
) -> str:
    normalized = (draft_value or "").strip()
    if normalized:
        return normalized
    if stored_value:
        return stored_value
    return default_value


@router.get("/ai", response_model=AIConfigResponse)
async def get_ai():
    """获取 AI 配置"""
    config = await get_ai_config()
    if not config:
        return AIConfigResponse(
            provider=DEFAULT_PROVIDER,
            base_url=DEFAULT_BASE_URL,
            model=DEFAULT_MODEL,
            has_api_key=False,
            updated_at=None
        )
    return AIConfigResponse(
        provider=config.get("provider", DEFAULT_PROVIDER),
        base_url=config.get("base_url", DEFAULT_BASE_URL),
        model=config.get("model", DEFAULT_MODEL),
        has_api_key=bool(config.get("api_key")),
        updated_at=_format_updated_at(config.get("updated_at"))
    )


@router.put("/ai", response_model=AIConfigSaveResponse)
async def save_ai_config(config: AIConfigUpdate):
    """更新 AI 配置"""
    existing = await get_ai_config()
    resolved_api_key, _ = _resolve_api_key(
        draft_api_key=config.api_key,
        stored_config=existing,
        allow_stored_fallback=config.keep_existing_api_key
    )

    if not resolved_api_key:
        raise HTTPException(status_code=400, detail="首次配置必须填写 API Key")

    draft = {
        "provider": config.provider,
        "api_key": resolved_api_key,
        "base_url": config.base_url,
        "model": config.model,
    }

    success, message = await test_ai_connection(draft)
    if not success:
        raise HTTPException(status_code=400, detail=f"保存前验证失败：{message}")

    await update_ai_config(
        provider=config.provider,
        base_url=config.base_url,
        model=config.model,
        api_key=resolved_api_key,
        keep_existing_api_key=False
    )

    return {"success": True, "message": "AI 配置已更新并验证通过"}


@router.post("/ai/test", response_model=AIConfigTestResponse)
async def test_ai(body: Optional[AIConfigTestRequest] = None):
    """测试 AI 连接（默认测试当前草稿配置）"""
    existing = await get_ai_config()
    draft_body = body or AIConfigTestRequest()
    resolved_api_key, used_stored_key = _resolve_api_key(
        draft_api_key=draft_body.api_key,
        stored_config=existing,
        allow_stored_fallback=draft_body.use_stored_api_key
    )

    if not resolved_api_key:
        return AIConfigTestResponse(success=False, message="API Key 未配置")

    draft = {
        "provider": _resolve_draft_value(
            draft_body.provider,
            existing.get("provider") if existing else None,
            DEFAULT_PROVIDER,
        ),
        "api_key": resolved_api_key,
        "base_url": _resolve_draft_value(
            draft_body.base_url,
            existing.get("base_url") if existing else None,
            DEFAULT_BASE_URL,
        ),
        "model": _resolve_draft_value(
            draft_body.model,
            existing.get("model") if existing else None,
            DEFAULT_MODEL,
        ),
    }

    success, message = await test_ai_connection(draft)
    return AIConfigTestResponse(
        success=success,
        message=message,
        used_stored_api_key=used_stored_key,
    )


@router.get("/schedule", response_model=ScheduleConfigResponse)
async def get_schedule():
    """获取定时任务配置"""
    jobs = get_jobs()
    persisted_schedule = await get_schedule_config()
    times = persisted_schedule.get("fetch_times") or get_fetch_schedule_times()
    latest_runs_raw = await get_latest_job_runs([job["id"] for job in jobs])
    latest_runs = {
        job_name: _format_job_run_summary(run)
        for job_name, run in latest_runs_raw.items()
    }
    return {"times": times, "jobs": jobs, "latest_runs": latest_runs}


@router.put("/schedule")
async def save_schedule(body: ScheduleUpdateRequest):
    """更新定时任务配置"""
    if not body.times:
        return {"success": False, "message": "请提供调度时间列表"}
    try:
        normalized_times = parse_schedule_times(body.times)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await update_schedule_config(normalized_times)
    update_schedule(normalized_times)
    return {"success": True, "message": f"定时任务已更新为每天 {', '.join(normalized_times)}"}


def _format_job_run_summary(run: dict) -> dict:
    return {
        "id": run.get("id", 0),
        "job_name": run.get("job_name", ""),
        "job_type": run.get("job_type", "scheduler"),
        "trigger_source": run.get("trigger_source", "cron"),
        "status": run.get("status", "unknown"),
        "started_at": _format_updated_at(run.get("started_at")),
        "finished_at": _format_updated_at(run.get("finished_at")),
        "error_message": run.get("error_message"),
        "payload": run.get("payload") or {},
        "result_summary": run.get("result_summary") or {},
    }
