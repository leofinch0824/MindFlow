# AI News Aggregator MVP - 设计文档

## 1. 项目概述

- **项目名称**: AI News Aggregator (ai-crawler)
- **项目类型**: 本地单用户工具
- **核心功能**: 通过 REST API 聚合多个新闻源，AI 自动总结，每日本地更新
- **目标用户**: 个人用户（本地使用，无需登录）

---

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 后端 | FastAPI + SQLite | 轻量、异步、零配置 |
| 前端 | React + TailwindCSS | 现代新闻流 UI |
| 定时任务 | APScheduler | Python 定时任务 |
| AI 调用 | OpenAI 兼容接口 | 支持 MiniMax / 硅基流动 |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  新闻源管理  │  │  资讯流展示  │  │   AI 总结面板       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 (FastAPI)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  新闻源 API  │  │  文章 API   │  │   AI 总结 API       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   SQLite    │  │  爬虫调度器  │  │  AI 服务    │
     │   数据库     │  │  (APScheduler) │  │  (OpenAI兼容) │
     └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 4. 功能模块

### 4.1 新闻源管理

**功能**:
- 添加新闻源（支持 REST API 配置）
- 编辑新闻源（名称、API URL、认证信息等）
- 删除新闻源
- 查看新闻源状态（最后抓取时间、文章数量）

**数据模型**:
```python
class NewsSource:
    id: int
    name: str                    # 新闻源名称
    source_type: str             # "mptext" / "custom"
    api_base_url: str            # API 基础 URL
    auth_key: str                # 认证密钥（可选）
    config: dict                # 特定类型的配置 (fakeid等)
    created_at: datetime
    updated_at: datetime
    last_fetch_at: datetime
    article_count: int           # 文章总数
```

### 4.2 文章抓取

**功能**:
- 定时抓取（默认每天 8:00, 12:00, 18:00）
- 手动触发抓取
- 支持增量抓取（只抓新文章）
- 错误重试和日志记录

**MPText 专用逻辑**:
```python
# 复用现有 mptext_crawler.py 的核心逻辑
1. 根据 fakeid 获取文章列表 (/api/public/v1/article)
2. 下载文章内容 (/api/public/v1/download?format=markdown)
3. 解析并存储到数据库
```

### 4.3 AI 总结

**功能**:
- 文章列表页显示 AI 摘要（一句话总结）
- 文章详情页显示完整总结
- 异步生成总结（不阻塞抓取流程）

**Prompt 模板**:
```
请用 50-80 字总结以下文章的核心内容，使用简洁的中文：
标题：{title}
内容：{content}
```

**AI 配置**:
```python
class AIConfig:
    provider: str      # "minimax" / "siliconflow"
    api_key: str
    base_url: str      # OpenAI 兼容端点
    model: str         # 模型名称
```

### 4.4 前端界面

**页面**:
1. **资讯流首页** - 展示最新文章列表，支持筛选和搜索
2. **文章详情页** - 展示完整文章内容和 AI 总结
3. **新闻源管理页** - CRUD 新闻源
4. **设置页** - AI 配置、定时任务配置

**UI 设计**:
- 新闻卡片式布局
- 左侧新闻源筛选
- 顶部搜索栏
- 文章支持 markdown 渲染
- 响应式设计（支持移动端）

---

## 5. 数据模型

### 5.1 数据库 Schema (SQLite)

```sql
-- 新闻源表
CREATE TABLE news_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'custom',
    api_base_url TEXT NOT NULL,
    auth_key TEXT,
    config TEXT,  -- JSON 存储特定配置
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_fetch_at TIMESTAMP,
    article_count INTEGER DEFAULT 0
);

-- 文章表
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    external_id TEXT,           -- 外部文章ID
    title TEXT NOT NULL,
    link TEXT,
    content TEXT,               -- Markdown 原文
    summary TEXT,               -- AI 总结
    author TEXT,
    published_at TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES news_sources(id)
);

-- AI 配置表
CREATE TABLE ai_config (
    id INTEGER PRIMARY KEY,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 抓取日志表
CREATE TABLE fetch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    status TEXT,  -- "success" / "failed"
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. API 接口设计

### 6.1 新闻源管理

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/sources` | 获取所有新闻源 |
| POST | `/api/sources` | 添加新闻源 |
| GET | `/api/sources/{id}` | 获取单个新闻源 |
| PUT | `/api/sources/{id}` | 更新新闻源 |
| DELETE | `/api/sources/{id}` | 删除新闻源 |
| POST | `/api/sources/{id}/fetch` | 手动触发抓取 |

### 6.2 文章管理

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/articles` | 获取文章列表（支持分页、筛选） |
| GET | `/api/articles/{id}` | 获取文章详情（含 AI 总结） |
| POST | `/api/articles/{id}/summarize` | 手动触发 AI 总结 |

### 6.3 系统配置

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/config/ai` | 获取 AI 配置 |
| PUT | `/api/config/ai` | 更新 AI 配置 |
| GET | `/api/config/schedule` | 获取定时任务配置 |
| PUT | `/api/config/schedule` | 更新定时任务配置 |

---

## 7. 项目结构

```
ai-crawler/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── database.py          # SQLite 数据库操作
│   ├── models.py            # Pydantic 模型
│   ├── routers/
│   │   ├── sources.py       # 新闻源 API
│   │   ├── articles.py      # 文章 API
│   │   └── config.py        # 配置 API
│   ├── services/
│   │   ├── crawler.py       # 爬虫服务（复用 mptext_crawler）
│   │   ├── ai.py           # AI 总结服务
│   │   └── scheduler.py     # 定时任务
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx        # 资讯流首页
│   │   │   ├── Article.tsx     # 文章详情
│   │   │   ├── Sources.tsx     # 新闻源管理
│   │   │   └── Settings.tsx    # 设置页
│   │   ├── components/
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── SourceFilter.tsx
│   │   │   └── SearchBar.tsx
│   │   └── api/            # API 客户端
│   ├── package.json
│   └── tailwind.config.js
├── data/                   # SQLite 数据库文件
├── docs/                   # 项目文档
│   └── superpowers/
│       └── specs/
└── README.md
```

---

## 8. MVP 里程碑

1. **Phase 1**: 项目脚手架搭建（后端 + 前端基础结构）
2. **Phase 2**: 新闻源 CRUD + MPText 爬虫集成
3. **Phase 3**: 文章展示 + AI 总结功能
4. **Phase 4**: 定时任务 + 美化 UI
5. **Phase 5**: 联调测试和文档

---

## 9. 验收标准

- [ ] 可添加/编辑/删除新闻源
- [ ] 可手动触发抓取 MPText 文章
- [ ] 文章列表展示正常，支持 markdown 渲染
- [ ] AI 总结功能正常（调用 MiniMax 或硅基流动）
- [ ] UI 美观，新闻卡片式布局
- [ ] 定时任务正常运行
- [ ] 后续可方便添加新的 REST API 新闻源