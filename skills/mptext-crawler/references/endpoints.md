# MPText API Top 5 Endpoints (from dashboard/api)

Base URL: `https://down.mptext.top`
Auth header: `X-Auth-Key: <MPTEXT_API_KEY>`

## 1) Search account by keyword

- **Name**: 根据关键字搜索公众号
- **Path**: `/api/public/v1/account`
- **Method**: `GET`
- **Auth**: Required
- **Query params**:
  - `keyword` (string, required)
  - `begin` (int, optional, default `0`, >= 0)
  - `size` (int, optional, default `5`, max `20`)
- **Returns**: `total`, `list[]` (contains `fakeid`, `nickname`, `alias`, `verify_status`, etc.)

---

## 2) Search account by article URL

- **Name**: 根据文章链接搜索公众号
- **Path**: `/api/public/v1/accountbyurl`
- **Method**: `GET`
- **Auth**: Required
- **Query params**:
  - `url` (string, required)
- **Returns**: `total`, `list[]`

---

## 3) Get article list by fakeid

- **Name**: 获取文章列表
- **Path**: `/api/public/v1/article`
- **Method**: `GET`
- **Auth**: Required
- **Query params**:
  - `fakeid` (string, required)
  - `begin` (int, optional, default `0`, >= 0)
  - `size` (int, optional, default `5`, max `20`)
- **Returns**: `articles[]` (`title`, `link`, `cover`, `update_time`, ...)

---

## 4) Download article content

- **Name**: 获取文章内容
- **Path**: `/api/public/v1/download`
- **Method**: `GET`
- **Auth**: Not required by docs
- **Query params**:
  - `url` (string, required, URL-encoded)
  - `format` (string, optional, default `html`)
- **Supported format**: `html` / `markdown` / `text` / `json`

### Download archiving behavior (skill script)

When calling via `scripts/mptext_crawler.py download`:

- Default archive directory: `/Users/jarvis/workspace/craw_wxs`
- Optional save args:
  - `--save-path <dir_or_file>`
  - `--filename <name>`
- Default filename rule:
  - `mptext_<YYYYmmdd_HHMMSS>_<slug>.<ext>`
  - slug source priority: `mid+idx` > `/s/<token>` > URL hash

---

## 5) Get account subject info (beta)

- **Name**: 查询公众号主体信息 (beta)
- **Path**: `/api/public/beta/authorinfo`
- **Method**: `GET`
- **Auth**: Not required by docs
- **Query params**:
  - `fakeid` (string, required)
- **Returns**: `identity_name`, `is_verify`, `original_article_count`, etc.

---

## Hook Quick Reference

- `hook:mptext.account` → endpoint #1
- `hook:mptext.accountbyurl` → endpoint #2
- `hook:mptext.article` → endpoint #3
- `hook:mptext.download` → endpoint #4
- `hook:mptext.authorinfo` → endpoint #5
