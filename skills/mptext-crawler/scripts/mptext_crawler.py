#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import shutil
import socket
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, ProxyHandler, build_opener

BASE_URL = os.environ.get("MPTEXT_BASE_URL", "https://down.mptext.top")
DEFAULT_WORKSPACE = "/Users/jarvis/.openclaw/agents-workspace/jarvis-workspace"
DEFAULT_ARCHIVE_DIR = "/Users/jarvis/workspace/craw_wxs"
CURL_TIMEOUT = int(os.environ.get("MPTEXT_CURL_TIMEOUT", "30"))
CURL_RETRY = int(os.environ.get("MPTEXT_CURL_RETRY", "1"))
API_KEY = ""
NO_PROXY_OPENER = build_opener(ProxyHandler({}))


class ExitWithCode(Exception):
    def __init__(self, code: int):
        self.code = code


def now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def log_error(category: str, action: str, code: str, message: str, suggestion: str = "") -> None:
    print(f"[{category}][{action}] code={code} message={message}", file=sys.stderr)
    if suggestion:
        print(f"[{category}][{action}] suggestion={suggestion}", file=sys.stderr)
    payload = {
        "ts": now_iso(),
        "level": "error",
        "category": category,
        "action": action,
        "code": code,
        "message": message,
        "suggestion": suggestion,
    }
    print(json.dumps(payload, ensure_ascii=False), file=sys.stderr)


def die(message: str, code: int = 2) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise ExitWithCode(code)


def trim(value: str) -> str:
    value = value.strip().strip('"').strip("'")
    return value.strip()


def load_api_key() -> str:
    global API_KEY
    candidates = []
    openclaw_workspace = os.environ.get("OPENCLAW_WORKSPACE")
    if openclaw_workspace:
        candidates.append(Path(openclaw_workspace) / ".env")
    candidates.extend([
        Path.cwd() / ".env",
        Path(DEFAULT_WORKSPACE) / ".env",
    ])

    pattern = re.compile(r"^\s*MPTEXT_API_KEY\s*=\s*(.+?)\s*$")
    for env_file in candidates:
        if not env_file.exists() or not env_file.is_file():
            continue
        for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            m = pattern.match(line)
            if not m:
                continue
            API_KEY = trim(m.group(1))
            if API_KEY:
                return API_KEY
    return ""


def normalize_format(value: str) -> str:
    f = value.lower()
    if f in {"md", "markdown"}:
        return "markdown"
    if f in {"txt", "text"}:
        return "text"
    if f in {"htm", "html"}:
        return "html"
    if f == "json":
        return "json"
    die(f"unsupported format: {value} (use html|markdown|text|json)")
    return ""


def ext_for_format(fmt: str) -> str:
    return {
        "markdown": "md",
        "text": "txt",
        "html": "html",
        "json": "json",
    }.get(fmt, "txt")


def hash_url(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def slug_from_url(url: str) -> str:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    mid = qs.get("mid", [""])[0]
    idx = qs.get("idx", [""])[0]
    sn = qs.get("sn", [""])[0]

    slug = ""
    if mid:
        slug = f"mid{mid}_idx{idx or '1'}"
    else:
        token_match = re.search(r"/s/([^?/#]+)", url)
        if token_match:
            slug = f"s_{token_match.group(1)}"
        elif sn:
            slug = f"sn_{sn}"
        else:
            slug = hash_url(url)

    slug = re.sub(r"[^a-zA-Z0-9._-]", "_", slug.lower())[:64]
    return slug or hash_url(url)


def generate_filename(fmt: str, url: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"mptext_{ts}_{slug_from_url(url)}.{ext_for_format(fmt)}"


def resolve_output_path(save_path: str, filename: str, fmt: str, url: str) -> Path:
    if not save_path:
        out_dir = Path(DEFAULT_ARCHIVE_DIR)
        out_file = filename or generate_filename(fmt, url)
    else:
        p = Path(save_path)
        if save_path.endswith("/") or p.is_dir():
            out_dir = Path(str(p).rstrip("/"))
            out_file = filename or generate_filename(fmt, url)
        elif p.suffix and not filename:
            out_dir = p.parent
            out_file = p.name
        else:
            out_dir = p
            out_file = filename or generate_filename(fmt, url)

    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / out_file


def parse_json_if_possible(text: str) -> Optional[dict]:
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except Exception:
        return None
    return None


def validate_api_response(action: str, response_text: str, mode: str = "strict") -> None:
    data = parse_json_if_possible(response_text)

    if mode == "strict" and data is None:
        log_error("API", action, "INVALID_JSON", "接口响应不是合法 JSON", "请稍后重试或检查接口可用性")
        raise ExitWithCode(3)

    if data is not None:
        base_resp = data.get("base_resp") if isinstance(data.get("base_resp"), dict) else {}
        ret = base_resp.get("ret")
        err_msg = str(base_resp.get("err_msg", ""))
        if ret is not None and str(ret) != "0":
            suggestion = "请检查参数或稍后重试"
            lower_msg = err_msg.lower()
            if "认证" in err_msg or "auth" in lower_msg:
                suggestion = "请检查 .env 中 MPTEXT_API_KEY 是否正确且已生效"
            elif "429" in err_msg or "频率" in err_msg or "too many" in lower_msg:
                suggestion = "触发限流，请降低频率并在 5-30 秒后重试"
            log_error("API", action, str(ret), err_msg or "接口返回失败", suggestion)
            raise ExitWithCode(3)


def http_get(path: str, params: Dict[str, str], require_key: bool, action: str) -> str:
    if require_key and not API_KEY:
        log_error("CONFIG", "auth", "MISSING_API_KEY", "MPTEXT_API_KEY not found", "请在 .env 配置 MPTEXT_API_KEY=YOUR_MPTEXT_API_KEY")
        raise ExitWithCode(2)

    query = urlencode(params)
    url = f"{BASE_URL}{path}?{query}" if query else f"{BASE_URL}{path}"
    headers = {}
    headers["User-Agent"] = "mptext-crawler/3.0 (+python)"
    headers["Accept"] = "*/*"
    if API_KEY:
        headers["X-Auth-Key"] = API_KEY

    attempts = max(1, CURL_RETRY + 1)
    last_exc = None
    for idx in range(attempts):
        try:
            req = Request(url, headers=headers, method="GET")
            with NO_PROXY_OPENER.open(req, timeout=CURL_TIMEOUT) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except HTTPError as e:
            body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
            if idx < attempts - 1 and e.code in {429, 500, 502, 503, 504}:
                time.sleep(1)
                continue
            suggestion = "HTTP 请求失败，请检查参数或接口状态"
            if e.code == 429:
                suggestion = "触发限流，请降低频率并在 5-30 秒后重试"
            log_error("NETWORK", action, f"HTTP_{e.code}", body or str(e), suggestion)
            raise ExitWithCode(4)
        except (URLError, socket.timeout, TimeoutError) as e:
            last_exc = e
            if idx < attempts - 1:
                time.sleep(1)
                continue

    err_msg = str(last_exc) if last_exc else "请求 MPText API 失败"
    suggestion = "网络连接失败，请检查代理/网络连通性后重试"
    log_error("NETWORK", action, "CURL_7", err_msg, suggestion)
    raise ExitWithCode(4)


def call_api(action: str, path: str, require_key: bool, params: Dict[str, str], mode: str = "strict") -> str:
    response_text = http_get(path, params, require_key, action)
    validate_api_response(action, response_text, mode)
    return response_text


def sanitize_path_component(name: str) -> str:
    text = name.replace("/", "_").replace(":", "_").replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r'[<>|*?"\\]', "", text)
    text = text[:40]
    return text or "未命名"


def extract_title_from_markdown(file_path: Path) -> str:
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip().split(" =", 1)[0] or "未命名文章"

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("![") or line.startswith("```") or line.startswith("[TOC]") or line.startswith("<style"):
            continue
        if re.match(r"^#[^ ]", line):
            continue
        if line.startswith("来源：") or line.startswith("作者：") or line.startswith("公众号："):
            continue
        if re.match(r"^[.#][A-Za-z0-9_-]+\s*\{", line):
            continue
        if re.search(r"\{[^}]*\}", line) and re.search(r":[^;]+;", line):
            continue
        return line.split(" =", 1)[0]

    return "未命名文章"


def extract_public_account_from_markdown(file_path: Path) -> str:
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    patterns = [
        r"公众号[:：]\s*([^|，。,；;]+)",
        r"来源[:：]\s*([^|，。,；;]+)",
        r"作者[:：]\s*([^|，。,；;]+)",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            acc = m.group(1).strip().strip("[]").lstrip("@")
            if acc:
                return acc
    return "未识别公众号"


def auto_topic_from_title(title: str, max_len: int = 10) -> str:
    topic = re.sub(r"[^\w\s\u4e00-\u9fff]", "", title, flags=re.UNICODE)
    topic = re.sub(r"\s+", " ", topic).strip()
    return topic[:max_len] if topic else "未命名"

def extract_nickname_from_json(meta: dict) -> str:
    if not isinstance(meta, dict):
        return ""
    nick = str(meta.get("nick_name", "")).strip()
    if nick:
        return nick
    biz_card = meta.get("biz_card")
    if isinstance(biz_card, dict):
        items = biz_card.get("list")
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    name = str(item.get("nickname", "")).strip()
                    if name:
                        return name
    return ""


def json_or_raw(output: str) -> None:
    data = parse_json_if_possible(output)
    if data is None:
        print(output)
    else:
        print(json.dumps(data, ensure_ascii=False, indent=2))


def download_binary(url: str, timeout: int = 30) -> bytes:
    req = Request(url, headers={"User-Agent": "mptext-crawler/3.0 (+python)"}, method="GET")
    with NO_PROXY_OPENER.open(req, timeout=timeout) as resp:
        return resp.read()


def cmd_account(args: argparse.Namespace) -> None:
    resp = call_api(
        action="account",
        path="/api/public/v1/account",
        require_key=True,
        params={"keyword": args.keyword, "begin": str(args.begin), "size": str(args.size)},
        mode="strict",
    )
    json_or_raw(resp)


def cmd_accountbyurl(args: argparse.Namespace) -> None:
    resp = call_api(
        action="accountbyurl",
        path="/api/public/v1/accountbyurl",
        require_key=True,
        params={"url": args.url},
        mode="strict",
    )
    json_or_raw(resp)


def cmd_article(args: argparse.Namespace) -> None:
    resp = call_api(
        action="article",
        path="/api/public/v1/article",
        require_key=True,
        params={"fakeid": args.fakeid, "begin": str(args.begin), "size": str(args.size)},
        mode="strict",
    )
    json_or_raw(resp)


def cmd_download(args: argparse.Namespace) -> None:
    fmt = normalize_format(args.format)
    resp = call_api(
        action="download",
        path="/api/public/v1/download",
        require_key=False,
        params={"url": args.url, "format": fmt},
        mode="allow_content",
    )

    out_path = resolve_output_path(args.save_path or "", args.filename or "", fmt, args.url)
    out_path.write_text(resp, encoding="utf-8")

    result = {
        "saved": True,
        "path": str(out_path),
        "bytes": out_path.stat().st_size,
        "format": fmt,
        "url": args.url,
        "filename_rule": "mptext_<YYYYmmdd_HHMMSS>_<slug>.<ext>",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if args.print:
        print(out_path.read_text(encoding="utf-8", errors="ignore"))


def cmd_authorinfo(args: argparse.Namespace) -> None:
    resp = call_api(
        action="authorinfo",
        path="/api/public/beta/authorinfo",
        require_key=False,
        params={"fakeid": args.fakeid},
        mode="strict",
    )
    json_or_raw(resp)


def cmd_archive(args: argparse.Namespace) -> None:
    temp_dir = Path(tempfile.mkdtemp(prefix="mptext_archive_"))
    try:
        print("📥 获取文章元数据中...")
        meta_raw = call_api(
            action="archive.meta",
            path="/api/public/v1/download",
            require_key=False,
            params={"url": args.url, "format": "json"},
            mode="allow_content",
        )
        meta = parse_json_if_possible(meta_raw) or {}
        meta_title = str(meta.get("title", "")).strip()
        meta_nickname = extract_nickname_from_json(meta)

        print("📥 下载文章中...")
        content = call_api(
            action="archive.download",
            path="/api/public/v1/download",
            require_key=False,
            params={"url": args.url, "format": "markdown"},
            mode="allow_content",
        )

        content_md = temp_dir / "content.md"
        content_md.write_text(content, encoding="utf-8")

        title = meta_title or extract_title_from_markdown(content_md)
        topic_base = args.topic or auto_topic_from_title(title, max_len=10)
        topic_base = re.sub(r"\s+", "_", topic_base.strip())
        crawl_time = datetime.now().strftime("%Y-%m-%d-%H%M")
        topic = sanitize_path_component(f"{topic_base}-{crawl_time}")

        account = args.account or meta_nickname or extract_public_account_from_markdown(content_md)
        account = sanitize_path_component(account)

        target_dir = Path(DEFAULT_ARCHIVE_DIR) / account / topic
        target_dir.mkdir(parents=True, exist_ok=True)

        detail_path = target_dir / "文章详情.md"
        outline_path = target_dir / "文章大纲.md"
        detail_path.write_text(content, encoding="utf-8")
        outline_path.write_text(
            "\n".join([
                f"# 文章大纲：{title}",
                "",
                "> 此大纲为自动生成占位符，建议手动编辑完善",
                "",
                "## 待整理",
                "",
                "- 内容需要人工梳理结构",
                "",
            ]),
            encoding="utf-8",
        )

        if not args.no_images:
            print("🖼️ 下载图片中...")
            images_dir = target_dir / "images"
            images_dir.mkdir(parents=True, exist_ok=True)

            text = detail_path.read_text(encoding="utf-8", errors="ignore")
            urls = sorted(set(re.findall(r"https://mmbiz\.[^)\s]+", text)))

            image_count = 0
            for url in urls:
                try:
                    data = download_binary(url, timeout=30)
                except Exception:
                    continue
                if not data:
                    continue
                image_count += 1
                image_name = f"img_{image_count:02d}.jpg"
                image_path = images_dir / image_name
                image_path.write_bytes(data)
                text = text.replace(url, f"images/{image_name}")
                print(f"   ✅ 下载: {image_name}")

            detail_path.write_text(text, encoding="utf-8")
            print(f"   📊 共下载 {image_count} 张图片")

        print("✅ 结构化归档完成！")
        print(f"📁 保存路径: {target_dir}")
        print("   ├── 文章大纲.md")
        print("   └── 文章详情.md")
        if not args.no_images:
            print("   └── images/")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="mptext_crawler.py")
    sub = parser.add_subparsers(dest="command", required=True)

    p_account = sub.add_parser("account")
    p_account.add_argument("--keyword", required=True)
    p_account.add_argument("--begin", type=int, default=0)
    p_account.add_argument("--size", type=int, default=5)
    p_account.set_defaults(func=cmd_account)

    p_accountbyurl = sub.add_parser("accountbyurl")
    p_accountbyurl.add_argument("--url", required=True)
    p_accountbyurl.set_defaults(func=cmd_accountbyurl)

    p_article = sub.add_parser("article")
    p_article.add_argument("--fakeid", required=True)
    p_article.add_argument("--begin", type=int, default=0)
    p_article.add_argument("--size", type=int, default=5)
    p_article.set_defaults(func=cmd_article)

    p_download = sub.add_parser("download")
    p_download.add_argument("--url", required=True)
    p_download.add_argument("--format", default="html")
    p_download.add_argument("--save-path", default="")
    p_download.add_argument("--filename", default="")
    p_download.add_argument("--print", action="store_true")
    p_download.set_defaults(func=cmd_download)

    p_authorinfo = sub.add_parser("authorinfo")
    p_authorinfo.add_argument("--fakeid", required=True)
    p_authorinfo.set_defaults(func=cmd_authorinfo)

    p_archive = sub.add_parser("archive")
    p_archive.add_argument("--url", required=True)
    p_archive.add_argument("--account", default="")
    p_archive.add_argument("--topic", default="")
    p_archive.add_argument("--no-images", action="store_true")
    p_archive.set_defaults(func=cmd_archive)

    return parser


def main() -> int:
    load_api_key()
    parser = build_parser()
    args = parser.parse_args()

    if hasattr(args, "size") and args.size > 20:
        die("--size should be <= 20")
    if hasattr(args, "begin") and args.begin < 0:
        die("--begin should be >= 0")
    if hasattr(args, "size") and args.size < 1:
        die("--size should be >= 1")

    try:
        args.func(args)
        return 0
    except ExitWithCode as e:
        return e.code


if __name__ == "__main__":
    sys.exit(main())
