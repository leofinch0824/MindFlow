import httpx
from openai import AsyncOpenAI
from database import get_ai_config


async def get_openai_client() -> AsyncOpenAI:
    """Get configured OpenAI-compatible client"""
    config = get_ai_config()
    return AsyncOpenAI(
        api_key=config["api_key"],
        base_url=config["base_url"]
    )


async def summarize_text(title: str, content: str, max_length: int = 150) -> str:
    """Generate AI summary for article content"""
    config = get_ai_config()

    if not config or not config["api_key"]:
        return "AI 配置未完成，请在设置页面配置 API Key"

    # Truncate content if too long
    truncated_content = content[:4000] if len(content) > 4000 else content

    prompt = f"""请用 50-{max_length} 字总结以下文章的核心内容，使用简洁的中文：

标题：{title}

内容：{truncated_content}

请直接输出总结，不要添加任何前缀或解释："""

    try:
        client = await get_openai_client()
        response = await client.chat.completions.create(
            model=config["model"],
            messages=[
                {"role": "system", "content": "你是一个文章总结助手，用简洁的中文总结文章内容。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        summary = response.choices[0].message.content.strip()
        return summary if summary else "AI 总结生成失败"
    except Exception as e:
        return f"AI 总结生成失败: {str(e)}"


async def test_ai_connection() -> tuple[bool, str]:
    """Test AI API connection"""
    try:
        client = await get_openai_client()
        response = await client.chat.completions.create(
            model=get_ai_config()["model"],
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=10
        )
        return True, "连接成功"
    except Exception as e:
        return False, str(e)
