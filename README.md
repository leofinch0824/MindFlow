# AI News Aggregator

本地 AI 新闻聚合平台 - 定时抓取 + 智能总结

## 功能特性

- 📰 **新闻源管理** - 支持微信公众号 (MPText) 和自定义 REST API
- 🔄 **定时抓取** - 每日自动抓取新闻源的最新文章
- 🤖 **AI 总结** - 自动生成文章摘要，支持 MiniMax、硅基流动等 OpenAI 兼容接口
- 🎨 **现代 UI** - 响应式设计，Markdown 文章渲染

## 技术栈

- **后端**: FastAPI + SQLite + APScheduler
- **前端**: React + TypeScript + TailwindCSS
- **AI**: OpenAI 兼容接口

## 快速开始

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 启动后端

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4. 启动前端

```bash
cd frontend
npm run dev
```

### 5. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 配置说明

### AI API 配置

在「设置」页面配置你的 AI API：

**硅基流动**:
- API Key: 你的硅基流动 API Key
- 端点: https://api.siliconflow.cn/v1
- 模型: Qwen/Qwen2.5-7B-Instruct

**MiniMax**:
- API Key: 你的 MiniMax API Key
- 端点: https://api.minimax.chat/v1
- 模型: MiniMax-Text-01

### 添加新闻源

1. 进入「新闻源」页面
2. 点击「添加新闻源」
3. 选择类型（微信公众号/自定义）
4. 填写配置信息并保存
5. 点击「抓取」获取文章

## 项目结构

```
ai-crawler/
├── backend/
│   ├── main.py           # FastAPI 入口
│   ├── database.py       # 数据库操作
│   ├── models.py         # Pydantic 模型
│   ├── routers/          # API 路由
│   └── services/         # 业务逻辑
├── frontend/
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   └── api/          # API 客户端
│   └── ...
├── data/                  # SQLite 数据库
└── docs/                  # 设计文档
```

## License

MIT
