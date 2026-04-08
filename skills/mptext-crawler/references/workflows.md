# MPText Crawler Workflows

## 1) 从文章链接提取元数据并抓取近期文章（推荐）

```bash
# Step 1: download article as JSON metadata
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py download \
  --url "https://mp.weixin.qq.com/s/xxxx" \
  --format json \
  --save-path "/tmp/mptext_meta"

# Step 2: extract fakeid candidate (fakeid > biz_card.list[].fakeid > bizuin), then list recent articles
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py article \
  --fakeid "<fakeid_or_bizuin>" --begin 0 --size 10
```

Validation gate:
- JSON contains `base_resp.ret=0` and usable account identifier (`fakeid` or `bizuin`).

## 2) 下载指定文章为 markdown 并归档

```bash
/Users/jarvis/.pyenv/versions/utils_env/bin/python /Users/jarvis/.openclaw/skills/mptext-crawler/scripts/mptext_crawler.py download \
  --url "https://mp.weixin.qq.com/s/xxxx" \
  --format markdown \
  --save-path "/Users/jarvis/workspace/craw_wxs"
```

Validation gate:
- response indicates `saved=true`
- local file exists and bytes > 0

Archive naming note:
- default topic folder name is `<topic>-YYYY-MM-DD-HHMM` to avoid overwriting repeated crawls.

## 3) 常见报错处理

### MPTEXT_API_KEY not found

Cause:
- `.env` missing `MPTEXT_API_KEY` or wrong file location.

Fix:
1. Add `MPTEXT_API_KEY=YOUR_MPTEXT_API_KEY` in one of:
   - `$OPENCLAW_WORKSPACE/.env`
   - current working directory `.env`
   - `/Users/jarvis/.openclaw/agents-workspace/jarvis-workspace/.env`
2. Retry the same command.

### unsupported format

Cause:
- format not in `html|markdown|text|json`.

Fix:
- normalize to supported values (`md->markdown`, `txt->text`, `htm->html`).

### empty result

Cause:
- keyword too narrow, fakeid invalid, URL not recognized, or source has no public content.

Fix:
- broaden keyword
- use `download --format json` to extract `fakeid/bizuin` first
- reduce expectations and return “未检索到结果” clearly

### accountbyurl returns 500

Cause:
- upstream endpoint unstable for this URL.

Fix:
1. fallback to `download --format json`
2. parse `fakeid` first; if missing use `bizuin`
3. continue with `article/authorinfo`
