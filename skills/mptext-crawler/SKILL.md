---
name: mptext-crawler
description: |
  微信公众号文章抓取与归档 skill。基于 MPText API（down.mptext.top）执行公众号搜索、文章元数据提取（download json）、文章列表获取、文章下载、主体信息查询、结构化归档。

  只要用户需求与“微信公众号内容处理”相关，都应优先使用此 skill（即使用户没提“mptext/爬虫”）。
  必须触发场景包括：搜索公众号、查看某号最近文章、下载/保存微信文章、根据 mp.weixin.qq.com 链接反查公众号、查询主体信息、给出 fakeid 让你继续处理。

  不触发场景：非微信平台内容（知乎/简书/普通网页）、用户明确要求不抓取不下载、仅做通用搜索引擎问答且不需要公众号数据。
---

# MPText Crawler

面向微信公众号的“检索 + 下载 + 归档”执行型 skill。

## 1. 目标

把用户请求稳定映射为可执行命令，并返回可复用结果（fakeid、文章列表、本地文件路径、主体信息）。

## 2. 触发与分流

先判断输入类型，再走对应模式。

### 模式 A：关键词搜号并看文章

适用：用户给公众号名/关键词，想看该号文章。

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py account \
  --keyword "<关键词>" --begin 0 --size 5
```

拿到 fakeid 后可继续：

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py article \
  --fakeid "<fakeid>" --begin 0 --size <1-20>
```

### 模式 B：文章链接元数据抽取（默认首选）

适用：用户提供 `mp.weixin.qq.com` 链接，想知道公众号、标题、账号标识，或后续继续查历史文章。

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py download \
  --url "<文章链接>" \
  --format json \
  --save-path "<目录或完整文件路径>"
```

读取 JSON 后提取字段（优先级）：

- `公众号名`: `nick_name` > `biz_card.list[].nickname`
- `标题`: `title`
- `账号标识(fakeid候选)`: `fakeid` > `biz_card.list[].fakeid` > `bizuin`
- `基础状态`: `base_resp.ret` / `base_resp.errmsg`

如需文章列表，使用上一步提取的 `fakeid`（或 `bizuin`）继续：

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py article \
  --fakeid "<fakeid_or_bizuin>" --begin 0 --size <1-20>
```

### 模式 C：下载文章正文（保存）

适用：用户要保存单篇文章内容（推荐先跑模式 B，确认元数据后再保存）。

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py download \
  --url "<文章链接>" \
  --format <markdown|html|text|json> \
  --save-path "<目录或完整文件路径>"
```

格式归一化：

- `md/markdown -> markdown`
- `txt/text/纯文本 -> text`
- `htm/html -> html`
- `json -> json`

### 模式 D：查询主体信息

适用：用户关心“这个号是谁的/主体名称是什么”。

如果只有链接，先按模式 B 提取 `fakeid_or_bizuin`，再查主体：

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py authorinfo \
  --fakeid "<fakeid_or_bizuin>"
```

### 模式 E：结构化归档（推荐）

适用：用户希望把文章存成后续可检索的资料目录。

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py archive \
  --url "<文章链接>" [--account "<公众号名>"] [--topic "<主题名>"] [--no-images]
```

默认输出结构：

```text
/Users/jarvis/workspace/craw_wxs/<公众号名>/<主题>/
├── 文章大纲.md
├── 文章详情.md
└── images/    # 默认启用，--no-images 可关闭
```

说明：

- 归档会先调用 `download --format json` 提取 `title` 与 `nick_name`，再下载 markdown 正文。
- `文章详情.md` 为下载原文（markdown）。
- `文章大纲.md` 当前为自动占位稿，后续可人工补全。
- 默认主题目录名使用 `title` 生成（前 10 字）并追加抓取时间戳，格式：`<topic>-YYYY-MM-DD-HHMM`。
- 未显式提供 `--account` / `--topic` 时，优先使用 json 元数据提取，提取失败再降级到 markdown 内容提取。

## 3. 执行前检查

### 3.1 目标合法性

- 微信公众号相关：执行。
- 非微信链接或平台：明确拒绝并说明仅支持公众号生态。

### 3.2 API Key

按顺序检查：

1. `$OPENCLAW_WORKSPACE/.env`
2. `$PWD/.env`
3. `/Users/jarvis/.openclaw/agents-workspace/jarvis-workspace/.env`

格式：`MPTEXT_API_KEY=YOUR_MPTEXT_API_KEY`

### 3.3 保存路径

- 用户指定路径优先。
- 未指定时默认：`/Users/jarvis/workspace/craw_wxs`。

## 4. 成功判据（Validation Gate）

- `account`：返回列表里有 `fakeid`。
- `download(json)`：`base_resp.ret=0` 且至少返回 `title`、`nick_name` 或 `bizuin/fakeid` 之一。
- `article`：返回非空文章列表。
- `download`：返回 `saved=true` 且文件存在、大小 > 0。
- `authorinfo`：返回主体字段（如 `identity_name`）。
- `archive`：目标目录存在且至少包含 `文章详情.md`。

## 5. 错误处理规范

- `MPTEXT_API_KEY` 缺失：提示 `.env` 配置示例后停止。
- 结果为空：明确“未检索到结果”，建议换关键词或改用链接反查。
- 格式不支持：自动归一化；无法归一化则提示支持列表。
- API 失败/超时：返回原错误并建议稍后重试。
- 限流（429）：建议退避后重试，避免高频批量请求。
- `accountbyurl` 失败（如 500）：回退到 `download --format json`，从返回体提取 `fakeid/bizuin` 与 `nick_name`。

## 6. 输出模板

执行完成后优先用结构化摘要回复：

```text
✅ 结论：<一句话结果>

📋 关键结果：
- fakeid_or_bizuin: <值或无>
- 公众号名(nick_name): <值或无>
- 标题(title): <值或无>
- 文章数量: <数字或无>
- 保存路径: <绝对路径或无>
- 主体名称: <值或无>

💡 下一步建议：<可执行下一步>
```

## 7. 速率与批量建议

- `size` 最大建议 20（接口上限）。
- 批量抓取建议每次请求间隔 1-2 秒。
- 若用户要求大批量，先确认范围（账号数、每号篇数、是否要下载正文）。

## 8. Evals

测试用例位于 `evals/evals.json`，用于覆盖：

- 搜索
- 反查
- 下载
- 批量
- 主体查询
- 非微信负向样例

## 9. 参考文件

- API 端点说明：`references/endpoints.md`
- 常见流程：`references/workflows.md`
