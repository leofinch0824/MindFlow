# Daily Digest + Now Workbench Progress Log

- **Branch:** `feat/now-workbench`
- **Worktree:** `/Users/pegasus/workplace/work_repos/mindflow/.worktrees/feat-now-workbench`
- **Spec:** `docs/superpowers/specs/2026-04-20-mindflow-next-phase-product-design.md`
- **Plan:** `docs/superpowers/plans/2026-04-20-daily-digest-now-workbench.md`
- **Last updated:** 2026-04-21

## Completed Tasks

### Task 1 — Lock the Now API contract before implementation
- **Commit:** `1391298`
- Added `backend/tests/test_now_api.py`
- Locked:
  - `GET /api/now`
  - `GET /api/now/{anchor_id}`
  - `PATCH /api/now/{anchor_id}/state`
- Task 1 review status:
  - spec review ✅
  - code review ✅

### Task 2 — Create the Now backend
- **Commit:** `b2483aa`
- Added:
  - `backend/routers/now.py`
  - `backend/services/now.py`
  - `backend/alembic/versions/20260420_01_add_article_workbench_state.py`
- Updated:
  - `backend/main.py`
  - `backend/models.py`
  - `backend/schemas.py`
  - `backend/database.py`
- Task 2 review status:
  - spec review ✅
  - code review ✅

### Task 3 — Switch frontend routing and navigation semantics
- **Commit:** `4dc9b22`
- Updated:
  - `frontend/src/App.tsx`
  - `frontend/src/components/Sidebar.tsx`
  - `frontend/src/components/TopNav.tsx`
  - `frontend/src/components/MobileNav.tsx`
  - `frontend/src/pages/Now.tsx`
- Result:
  - `/` now redirects to `/daily-digest`
  - `/newsletter` remains as a compatibility redirect
  - `/now` and `/now/:anchorId` are live
  - nav labels now use `Daily Digest / Now / Interests / Sources / Settings`
  - nested `/now/:anchorId` keeps the `Now` nav item active
- Task 3 review status:
  - spec review ✅
  - code review ✅

### Task 4 — Extend the frontend API client with `nowApi`
- **Commit:** `4dc9b22`
- Updated:
  - `frontend/src/api/newsletter.ts`
- Result:
  - added `nowApi.list`
  - added `nowApi.getDetail`
  - added `nowApi.updateState`
  - added stricter client-facing `NowItem` / `NowDetail` normalization to support the upcoming real workbench UI
- Task 4 review status:
  - spec review ✅
  - code review ✅

### Task 5 — Turn Daily Digest cards into internal detail entry points
- **Commit:** `b702470`
- Updated:
  - `frontend/src/pages/Newsletter.tsx`
- Result:
  - the hero now uses `Daily Digest`
  - main digest cards now use `Open Detail`
  - digest click behavior navigates to `/now/:anchorId?from=digest&date=...`
  - digest-only negative feedback remains on the digest page
  - direct source reading is no longer the primary digest exit
- Task 5 review status:
  - spec review ✅
  - code review ✅

### Task 6 — Replace the Now placeholder with the real workbench
- **Commit:** `b702470`
- Added:
  - `frontend/src/components/now/NowContextRail.tsx`
  - `frontend/src/components/now/NowQueueList.tsx`
  - `frontend/src/components/now/NowDetailPane.tsx`
- Updated:
  - `frontend/src/pages/Now.tsx`
- Result:
  - queue, context rail, and detail reader are now live
  - `Now` fetches queue + detail from `nowApi`
  - read / processed actions are wired
  - queue selection is guarded during in-flight state updates
  - stale detail responses are ignored so the route target stays authoritative
  - `Read Source` only renders when a real source URL exists
- Task 6 review status:
  - spec review ✅
  - code review ✅

## Verification Snapshot

### Task 2 verification that passed
```bash
cd backend
source .venv/bin/activate
POSTGRES_PASSWORD=mindflow_dev alembic upgrade head
POSTGRES_PASSWORD=mindflow_dev pytest tests/test_now_api.py tests/test_articles.py tests/test_digests.py tests/test_main.py tests/test_sources.py tests/test_config.py tests/test_full_flow.py -q
python -m compileall backend
```

Result:
- `alembic upgrade head` ✅
- focused backend suite: `42 passed` ✅
- `compileall backend` ✅

### Known environment note
```bash
cd backend
source .venv/bin/activate
POSTGRES_PASSWORD=mindflow_dev pytest tests/test_database.py -q
```

Result:
- cannot collect because `pytest_asyncio` is missing in the current environment
- not treated as a Task 2 blocker because no new dependency installation was requested

### Task 3 / Task 4 verification that passed
```bash
cd frontend
npm run build
```

Result:
- frontend production build ✅

### Task 5 / Task 6 verification that passed
```bash
cd frontend
npm run build
```

Result:
- frontend production build ✅

## Remaining Work

### Next up
1. **Task 7** — update README and run end-to-end verification

## Important Implementation Notes

- The current backend keeps article workbench state on `articles` (`read_at`, `processed_at`, `last_opened_at`) for the single-user MVP.
- Task 1 contract tests intentionally allow a minimal response shape when router helpers are patched. Because of that, `backend/schemas.py` keeps some `Now` fields optional for compatibility, while the real runtime service returns richer payloads for frontend integration.
- Local Docker PostgreSQL was needed to verify Alembic and `/health`-related tests.
