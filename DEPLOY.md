# MindFlow Docker 部署指南

适用于内网 localhost 环境

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/Cuber-final/MindFlow.git
cd MindFlow
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入你的 API Key
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 停止服务

```bash
docker-compose down
```

## 数据持久化

SQLite 数据库保存在 `./data` 目录。

## 清理

```bash
# 停止并删除容器
docker-compose down

# 删除镜像
docker-compose rm
```
