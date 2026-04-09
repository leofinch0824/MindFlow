# AI News Aggregator V2

> 个性化每日资讯简报平台 - 基于 AI 的智能新闻聚合与个性化推荐

## 功能特性

### 核心功能
- 📰 **Newsletter 形态简报** - 每日自动生成结构化资讯简报，包含锚点提取和辩证分析
- 🤖 **AI 智能加工** - 自动从文章中提取关键洞察，生成辩证性分析（支持/质疑/延伸）
- 🎯 **兴趣标签系统** - 用户可管理兴趣标签，AI 学习偏好实现个性化推荐
- 📊 **行为跟踪** - 自动收集阅读行为（停留、点击、滚动），持续优化推荐
- 🔄 **探索机制** - 主航道 60% + 探索区 30% + 惊喜箱 10%，避免信息茧房

### 信息源
- 📱 **微信公众号** - 通过 MPText API 抓取
- 📝 **知乎** - 抓取知乎文章和回答 (开发中)
- 📡 **RSS 订阅** - 支持标准 RSS/Atom 订阅源 (开发中)

### 技术亮点
- **每日简报自动生成** - 定时抓取 + AI 锚点提取 + 简报合成
- **显式 + 隐式反馈** - Show/Hide 按钮 + 行为信号驱动权重更新
- **实时权重调整** - 基于信号衰减和多样性惩罚的自适应算法

## 技术栈

- **后端**: FastAPI + SQLite + APScheduler
- **前端**: React + TypeScript + TailwindCSS
- **AI**: OpenAI 兼容接口 (硅基流动 / MiniMax)

## 快速开始

### 1. 克隆并安装依赖

```bash
cd backend
pip install -r requirements.txt

cd ../frontend
npm install
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 MPTEXT_API_KEY
```

### 3. 启动服务

```bash
# 终端 1: 启动后端
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# 终端 2: 启动前端
cd frontend
npm run dev
```

### 4. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 配置说明

### AI API 配置

在「设置 → AI 配置」页面配置：

| 供应商 | 端点 | 推荐模型 |
|--------|------|----------|
| 硅基流动 | https://api.siliconflow.cn/v1 | Qwen/Qwen2.5-7B-Instruct |
| MiniMax | https://api.minimax.chat/v1 | MiniMax-Text-01 |

### 微信公众号配置

1. 从 https://mptext.cn 获取 API Key
2. 在「设置 → AI 配置」填入 `MPTEXT_API_KEY`

### 信息源管理

1. 进入「新闻源」页面
2. 点击「添加新闻源」
3. 选择类型（微信公众号）
4. 填写配置信息并保存
5. 系统将自动定时抓取最新文章

## 项目结构

```
ai-crawler/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── database.py          # SQLite 数据库操作
│   ├── models.py            # Pydantic 数据模型
│   ├── routers/             # API 路由
│   │   ├── articles.py      # 文章管理
│   │   ├── sources.py        # 信息源管理
│   │   ├── digests.py       # 简报生成
│   │   ├── interests.py     # 兴趣标签
│   │   ├── behavior.py      # 行为日志
│   │   └── config.py        # 系统配置
│   └── services/
│       ├── ai.py            # AI 调用服务
│       ├── crawler.py       # 爬虫服务
│       ├── scheduler.py      # 定时任务
│       └── learning.py       # 权重学习算法
├── frontend/
│   └── src/
│       ├── pages/            # 页面组件
│       │   ├── Newsletter.tsx   # 简报首页
│       │   ├── Sources.tsx       # 新闻源管理
│       │   └── InterestSettings.tsx  # 兴趣设置
│       ├── components/       # 通用组件
│       │   └── InsightCard.tsx     # 洞察卡片
│       ├── hooks/
│       │   └── useBehaviorCollector.ts  # 行为收集
│       └── api/
│           └── newsletter.ts  # API 客户端
├── data/                     # SQLite 数据库文件
└── docs/                     # 设计文档和规格
```

## 开发

### 运行测试

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

### 构建前端

```bash
cd frontend
npm run build
```

## License

MIT
