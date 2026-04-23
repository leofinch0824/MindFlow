# Job Observability And Data Model Plan

> 日期：2026-04-24
> 覆盖需求：`REQ-OPS-002` + `REQ-DATA-002`
> 状态：drafted-in-chat

**Goal:** 补齐后台 Job 级可观测模型，让调度任务具备可持久化的执行状态、结果摘要和失败原因；同时把这些字段通过稳定 API 暴露出来，为后续 `REQ-OPS-004` 设置页接线和 `REQ-OPS-003` 任务页打基础。

**Architecture:** 新增独立的 Job execution / run 持久化模型，保持现有 `Article` 正文状态字段不变；在 scheduler 入口层统一写入 Job run 的 `started -> success/failed/skipped/partial` 生命周期；扩展 `/api/config/schedule` 返回“调度配置 + 最近执行摘要”，但暂不做任务页和前端 UI。

**Tech Stack:** FastAPI, SQLAlchemy async ORM, PostgreSQL, Alembic, APScheduler, pytest

---

## Scope

### In Scope

- 新增 Job run 持久化表与数据库 helper
- 为 `daily_fetch`、`daily_digest`、`we_mp_rss_content_refresh`、`anchor_extract` 补执行记录
- 让 `daily_fetch` / `daily_digest` 产出结构化 `result_summary`
- 调整 config schedule API，让最近执行状态可被前端消费
- 为新模型、scheduler 写入逻辑、API 返回补测试

### Out Of Scope

- `REQ-OPS-004` 设置页 UI 接线
- `REQ-OPS-003` 独立任务 / 日志页
- 历史 Job 记录回填
- 全量替换或删除现有 `FetchLog`

### Decisions Locked

- 不复用 `FetchLog` 作为主可观测模型；它继续保留为抓取层辅助日志
- 不新建新的 Article 状态表；`Article.content_refresh_status` 继续承接正文回填状态
- `REQ-DATA-002` 这一轮剩余范围，聚焦 Job 级状态模型，不再重复扩 `we_mp_rss` provider id 基础
- `/api/config/schedule` 保持兼容，保留现有 `jobs`，在此基础上追加最近执行摘要字段
- 调度语义从“高频近实时后处理”收敛为“按日批处理闭环优先”
- `we_mp_rss` 正文回填的入队延迟从 `10` 分钟调整为 `5` 分钟
- 每日简报默认总结“昨天抓取到的文章”，而不是无边界消费所有锚点
- `anchor_extract` 改为围绕“昨日抓取文章”的集中批处理，不再默认每 `5` 分钟滚动扫库

### Scheduling Direction Revision (`2026-04-24`)

用户确认了新的运行原则：

1. 近实时分钟级 `we_mp_rss_content_refresh` 和 `anchor_extract` 成本过高，不再作为默认运行方式
2. `we_mp_rss` 文章在发现后仍先入库为 `waiting_for_refresh`，但最小等待窗口收敛为 `5` 分钟
3. 产品默认消费口径改为：
   - 今天早上查看昨天抓取到的完整信息
   - 允许存在少量遗漏，不强求近实时完整
4. AI 后处理应收敛到更集中的批次窗口，便于后续扩展“摘要 / 锚点 / 其他可配置动作”
5. 默认来源抓取时间调整为 `08:00 / 12:00 / 18:00 / 23:30`（`Asia/Shanghai`）
   - `23:30` 作为当天最后一次补抓，用来尽量覆盖晚间新增文章，降低次日早报遗漏

---

## File Targets

- Modify: `backend/models.py`
- Modify: `backend/database.py`
- Modify: `backend/services/scheduler.py`
- Modify: `backend/routers/config.py`
- Modify: `backend/schemas.py`
- Modify: `backend/tests/test_config.py`
- Modify: `backend/tests/test_database.py`
- Create: `backend/tests/test_scheduler_observability.py`
- Create: `backend/alembic/versions/20260424_01_add_job_runs.py`

---

## Task 1: Lock The Job Run Contract With Tests

**Goal:** 先把 Job 可观测契约钉住，再做实现，避免再出现“先写 print 再补模型”的倒序。

- [ ] 在 `backend/tests/test_database.py` 新增失败用例，覆盖 Job run 的创建、完成、失败、最近一次查询
- [ ] 在 `backend/tests/test_scheduler_observability.py` 新增失败用例，覆盖：
  - `daily_fetch` 成功时写入 `success` 或 `partial`
  - `daily_fetch` 异常时写入 `failed`
  - `daily_digest` 已存在简报时写入 `skipped`
  - `daily_digest` 无锚点时写入 `skipped`
  - `we_mp_rss_content_refresh` 和 `anchor_extract` 成功时写入摘要
- [ ] 在 `backend/tests/test_config.py` 扩展 `/api/config/schedule` 断言，要求返回：
  - `jobs`
  - `latest_runs`

**Verification**

```bash
cd /Users/pegasus/workplace/work_repos/mindflow/backend
./.venv/bin/python -m pytest tests/test_database.py tests/test_scheduler_observability.py tests/test_config.py -q
```

预期：先失败在缺少 Job run 模型、helper 和 API 字段。

---

## Task 2: Add The Job Run Data Model

**Goal:** 为 `REQ-DATA-002` 补齐最小但稳定的 Job 级状态模型。

- [ ] 在 `backend/models.py` 新增 `JobRun` 模型，建议字段：
  - `id`
  - `job_name`
  - `job_type`
  - `trigger_source`
  - `status`
  - `target_type`
  - `target_id`
  - `retry_count`
  - `started_at`
  - `finished_at`
  - `error_message`
  - `payload`
  - `result_summary`
  - `created_at`
- [ ] 在 Alembic migration 中创建 `job_runs` 表和必要索引：
  - `job_name + started_at`
  - `status`
  - `created_at`
- [ ] 在 `backend/database.py` 新增 helper：
  - `create_job_run(...)`
  - `finish_job_run_success(...)`
  - `finish_job_run_failure(...)`
  - `finish_job_run_skipped(...)`
  - `get_latest_job_runs(job_names: list[str])`

**Design Notes**

- `status` 建议收敛为：`running | success | failed | skipped | partial`
- `payload` 用于输入上下文，例如手动触发 / 调度触发、小时配置、目标日期
- `result_summary` 用于结果摘要，供 API 和后续 UI 直接消费

**Verification**

```bash
cd /Users/pegasus/workplace/work_repos/mindflow/backend
./.venv/bin/python -m pytest tests/test_database.py -q
```

---

## Task 3: Instrument Scheduler Entry Points

**Goal:** 把 Job run 写入点放在 scheduler 入口，而不是零散散落在抓取或 AI 服务里。

- [ ] 重构 `backend/services/scheduler.py`，区分“纯执行函数”和“带 observability 的 job wrapper”
- [ ] 为以下任务写入 Job run 生命周期：
  - `daily_fetch`
  - `daily_digest`
  - `we_mp_rss_content_refresh`
  - `anchor_extract`
- [ ] 在实现前先重构 scheduler 语义，避免把旧的分钟级 job 直接观测化后又立刻推翻：
  - `we_mp_rss_content_refresh` 改为批处理 job，而不是每分钟轮询
  - `anchor_extract` 改为按目标业务日期运行的批处理 job
  - `daily_digest` 改为默认汇总“昨天抓取”的内容
- [ ] 明确 `daily_fetch` 的聚合摘要字段，至少包括：
  - `sources_total`
  - `sources_succeeded`
  - `sources_failed`
  - `articles_added`
  - `content_backfilled`
  - `anchors_extracted`
- [ ] 明确 `daily_digest` 的聚合摘要字段，至少包括：
  - `digest_date`
  - `target_article_date`
  - `anchor_count`
  - `total_articles`
  - `digest_id`
  - `skip_reason`（如已存在 / 无锚点）
- [ ] 对异常路径统一记录：
  - `error_message`
  - `finished_at`
  - 合适的 `failed` / `partial` / `skipped`

**Scheduler Semantics To Implement**

- `daily_fetch`
  - 继续负责来源抓取，不承担分钟级后处理
  - 默认抓取窗口为 `08:00 / 12:00 / 18:00 / 23:30`（`Asia/Shanghai`）
- `we_mp_rss_content_refresh`
  - 改为批量处理满足 `delay_minutes=5` 的 `waiting_for_refresh` 文章
  - 目标是为“昨日抓取文章”在每日聚合处理前尽量补全正文
- `anchor_extract`
  - 只处理指定业务日期内、正文已 ready 的文章
  - 默认业务日期为“昨天（Asia/Shanghai）”
- `daily_digest`
  - 只消费指定业务日期的锚点
  - 默认生成“今天看到的昨天简报”

**Important Implementation Rule**

- `daily_fetch` 当前会内联调用正文回填与锚点提取，因此要避免重复写两层 Job run。
- 建议把“实际执行逻辑”拆成可复用内部函数，再让各自的 scheduler wrapper 决定是否记录独立 run。
- 这轮要把“抓取”和“后处理”真正解耦，否则新的按日批处理语义无法稳定落地

**Verification**

```bash
cd /Users/pegasus/workplace/work_repos/mindflow/backend
./.venv/bin/python -m pytest tests/test_scheduler_observability.py tests/test_we_mprss_flow.py -q
```

---

## Task 4: Extend The Config Schedule API Contract

**Goal:** 让现有 schedule API 直接成为设置页和后续任务页的后端基础。

- [ ] 在 `backend/schemas.py` 新增 schedule 响应模型，例如：
  - `ScheduleJobResponse`
  - `JobRunSummaryResponse`
  - `ScheduleConfigResponse`
- [ ] 在 `backend/routers/config.py` 扩展 `GET /api/config/schedule`，返回：
  - `jobs`: 当前调度任务及下次运行时间
  - `latest_runs`: 以 `job_name` 为 key 的最近一次执行摘要
- [ ] 保持 `PUT /api/config/schedule` 行为不变，不在本轮额外扩 UI 语义

**Compatibility Rule**

- 现有前端只消费 `jobs`；新增字段必须是向后兼容扩展，不能破坏当前接口

**Verification**

```bash
cd /Users/pegasus/workplace/work_repos/mindflow/backend
./.venv/bin/python -m pytest tests/test_config.py -q
```

---

## Task 5: Align Backlog Status And Execution Notes

**Goal:** 开发完成后，把需求池状态和备注改成能反映真实完成面。

- [ ] `REQ-OPS-002` 改为 `done` 或至少 `in_progress -> done`，备注补“Job 可观测模型与摘要 API 已补齐”
- [ ] `REQ-DATA-002` 改为 `done`，备注补“Job run 数据模型完成；Article 正文状态沿用既有模型”
- [ ] 如本轮 API 契约已满足后续 UI 接线，可同步更新 `REQ-DATA-003` 备注

---

## Verification Matrix

开发完成时至少执行：

```bash
cd /Users/pegasus/workplace/work_repos/mindflow/backend
./.venv/bin/python -m pytest tests/test_database.py tests/test_scheduler_observability.py tests/test_we_mprss_flow.py tests/test_config.py -q
POSTGRES_PASSWORD=mindflow_dev ./.venv/bin/python -m alembic upgrade head
POSTGRES_PASSWORD=mindflow_dev ./.venv/bin/python -m alembic current
```

如需更高置信度，再补：

```bash
cd /Users/pegasus/workplace/work_repos/mindflow/backend
./.venv/bin/python -m pytest -q
```

---

## Risks

- `daily_fetch` 目前既是聚合任务，又会内联正文回填和提锚点，若拆分不干净，容易出现重复 Job run 或统计口径不一致
- `FetchLog` 与新的 `JobRun` 语义会短期并存，需要避免调用方混淆
- 如果 `result_summary` 结构过早做复杂，后续前端消费会被不稳定字段拖累；这一轮应先收敛稳定核心字段
- 历史运行记录不会自动补齐，因此新 API 在部署初期可能只对新任务有数据
