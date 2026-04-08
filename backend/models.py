from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# News Source Models
class NewsSourceCreate(BaseModel):
    name: str
    source_type: str = "custom"
    api_base_url: str
    auth_key: str = ""
    config: dict = {}


class NewsSourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[str] = None
    api_base_url: Optional[str] = None
    auth_key: Optional[str] = None
    config: Optional[dict] = None


class NewsSourceResponse(BaseModel):
    id: int
    name: str
    source_type: str
    api_base_url: str
    auth_key: str
    config: dict
    created_at: Optional[str]
    updated_at: Optional[str]
    last_fetch_at: Optional[str]
    article_count: int


# Article Models
class ArticleResponse(BaseModel):
    id: int
    source_id: int
    external_id: str
    title: str
    link: str
    content: str
    summary: str
    author: str
    published_at: Optional[str]
    fetched_at: str
    source_name: Optional[str] = None


class ArticleListResponse(BaseModel):
    items: list[ArticleResponse]
    total: int
    limit: int
    offset: int


# AI Config Models
class AIConfigUpdate(BaseModel):
    provider: str
    api_key: str
    base_url: str
    model: str


class AIConfigResponse(BaseModel):
    provider: str
    base_url: str
    model: str
    updated_at: Optional[str]


# Fetch Response
class FetchResponse(BaseModel):
    success: bool
    message: str
    articles_added: int = 0


# Summarize Request
class SummarizeRequest(BaseModel):
    article_id: int
