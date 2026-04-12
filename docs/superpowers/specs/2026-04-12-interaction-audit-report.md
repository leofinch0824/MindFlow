# 交互审查报告（研发可执行 PRD 前置）

## 1. 审查结论摘要

## 运行态点测结果

- 覆盖范围：
  - 按 `README.md` 的后端测试说明使用 `backend/.venv` 运行点测，执行了 `tests/test_digests.py`、`tests/test_sources.py tests/test_config.py`、`tests/test_full_flow.py` 三组高风险路径校验。
  - `tests/test_digests.py` 覆盖 digest 查询接口与 AI 摘要 mock 合约（4 项）。
  - `tests/test_sources.py tests/test_config.py` 覆盖 source CRUD / 响应序列化、AI config 读写 / test connection / schedule（合计 15 项）；其中 `tests/test_config.py` 已额外单独复跑确认。
  - `tests/test_full_flow.py` 覆盖 source parse/fetch、AI 摘要、interest feedback、API error smoke（10 项）。
- 通过项：
  - `backend/.venv/bin/python -m pytest tests/test_digests.py -q`：4 项中 2 项通过，`GET /api/digests/latest` 与 `GET /api/digests/by-date/{date}` 的查询类测试当前可通过。
  - `backend/.venv/bin/python -m pytest tests/test_config.py -q`：8/8 通过，AI 配置读取 / 保存 / 测试连接与调度接口在当前 mock 测试下可通过。
  - `backend/.venv/bin/python -m pytest tests/test_sources.py tests/test_config.py -q`：sources+config 合计 15 项中 11 项通过；其中 source 侧空列表、404、删除路径通过。
  - `backend/.venv/bin/python -m pytest tests/test_full_flow.py -q`：10 项中 2 项通过，微信 URL parse 正常 / 非法输入两项 smoke 通过。
- 失败项：
  - `tests/test_digests.py::TestAISummarize::test_summarize_text_with_mocked_ai` 与 `tests/test_digests.py::TestAISummarize::test_summarize_text_without_config` 失败：`services/ai.py:98` 将 `get_ai_config()` 返回值按同步 dict 读取，当前测试下得到 coroutine，触发 `TypeError: 'coroutine' object is not subscriptable`；同轮输出还出现 `AsyncMockMixin._execute_mock_call was never awaited` 警告。
  - `tests/test_sources.py` 中 `test_list_sources_with_data`、`test_get_source_by_id`、`test_create_source`、`test_update_source` 失败：`routers/sources.py:32` 的 `_format_datetime()` 对字符串时间直接调用 `.isoformat()`，在 mocked source dict 返回 `"2026-04-08 10:00:00"` 时触发 `AttributeError`，影响 source 读写回包序列化。
  - `tests/test_full_flow.py::TestArticleFetching::test_fetch_source_articles_mock` 失败：`services/crawler.py:357` 对 coroutine `source` 直接执行下标访问，触发 `TypeError: 'coroutine' object is not subscriptable`，说明 fetch 流程的 service/mock 合约当前不稳定。
  - `tests/test_full_flow.py::TestDigestFlowWithMocks::*` 两项失败，复现与 `tests/test_digests.py` 相同的 AI 配置异步读取问题。
  - `tests/test_full_flow.py` 中 interest / API error 相关 5 项在连接 PostgreSQL（`asyncpg` -> `localhost:5432`）时触发 `PermissionError: [Errno 1] Operation not permitted`；这是当前沙箱运行环境限制下的硬错误，本轮只能记录为“未完成运行态确认”，不能据此推断业务逻辑本身通过或失败。
- 对判定级别的影响：
  - 本轮点测未直接改写现有 `interaction-gap-log.md` 中已登记交互项的 P0/P1/P2 级别，因此未调整 gap log 行级 severity。
  - 运行态证据降低了对 backend 稳定性的置信度：AI 摘要路径、source 返回序列化与 source fetch mock 流程均存在可复现失败，后续若这些路径进入最终交互结论，需要作为独立 backend 缺口继续追踪，不能把本轮点测视为风险缓释证据。

## 2. 审查范围与基准

## 3. 合理交互逻辑清单（Green）

## 4. 不合理交互逻辑清单（Red/Yellow）

## 5. 风险优先级分布（P0/P1/P2）

## 6. 深挖议题总览

## 7. 下一步输入给研发可执行 PRD 的规则
