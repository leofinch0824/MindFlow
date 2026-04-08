from fastapi import APIRouter, HTTPException
from models import NewsSourceCreate, NewsSourceUpdate, NewsSourceResponse, FetchResponse
from database import (
    get_all_sources, get_source_by_id, create_source,
    update_source, delete_source, add_fetch_log
)
from services.crawler import fetch_source_articles
import json

router = APIRouter(prefix="/api/sources", tags=["新闻源管理"])


@router.get("", response_model=list[NewsSourceResponse])
async def list_sources():
    """获取所有新闻源"""
    sources = await get_all_sources()
    for s in sources:
        if s.get("config") and isinstance(s["config"], str):
            s["config"] = json.loads(s["config"])
    return sources


@router.post("", response_model=NewsSourceResponse)
async def add_source(source: NewsSourceCreate):
    """添加新闻源"""
    source_id = await create_source(
        name=source.name,
        source_type=source.source_type,
        api_base_url=source.api_base_url,
        auth_key=source.auth_key,
        config=source.config
    )
    result = await get_source_by_id(source_id)
    if result and result.get("config") and isinstance(result["config"], str):
        result["config"] = json.loads(result["config"])
    return result


@router.get("/{source_id}", response_model=NewsSourceResponse)
async def get_source(source_id: int):
    """获取单个新闻源"""
    source = await get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="新闻源不存在")
    if source.get("config") and isinstance(source["config"], str):
        source["config"] = json.loads(source["config"])
    return source


@router.put("/{source_id}", response_model=NewsSourceResponse)
async def modify_source(source_id: int, update: NewsSourceUpdate):
    """更新新闻源"""
    source = await get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="新闻源不存在")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    await update_source(source_id, **update_data)

    result = await get_source_by_id(source_id)
    if result and result.get("config") and isinstance(result["config"], str):
        result["config"] = json.loads(result["config"])
    return result


@router.delete("/{source_id}")
async def remove_source(source_id: int):
    """删除新闻源"""
    source = await get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="新闻源不存在")
    await delete_source(source_id)
    return {"success": True, "message": "删除成功"}


@router.post("/{source_id}/fetch", response_model=FetchResponse)
async def trigger_fetch(source_id: int):
    """手动触发抓取"""
    source = await get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="新闻源不存在")

    count, msg = await fetch_source_articles(source_id)
    return FetchResponse(
        success=count > 0 or "成功" in msg,
        message=msg,
        articles_added=count
    )
