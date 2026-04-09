"""
Test digest generation with mocked AI calls
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient


class TestDigestGeneration:
    """Tests for digest generation flow"""

    @pytest.fixture
    def client(self):
        from main import app
        return TestClient(app)

    @pytest.fixture
    def mock_ai_config(self):
        return {
            "id": 1,
            "provider": "siliconflow",
            "api_key": "sk-test-mock",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Qwen/Qwen2.5-7B-Instruct",
            "updated_at": "2026-04-08 10:00:00"
        }

    def test_get_latest_digest(self, client):
        """Test getting latest digest"""
        mock_digest = {
            "id": 1,
            "date": "2026-04-09",
            "title": "AI资讯日报",
            "overview": "今日AI领域重要进展",
            "sections": [],
            "total_articles_processed": 10,
            "anchor_count": 5,
            "created_at": "2026-04-09 08:00:00"
        }

        with patch("routers.digests.get_latest_digest", return_value=mock_digest):
            response = client.get("/api/digests/latest")
            assert response.status_code == 200
            data = response.json()
            assert data["title"] == "AI资讯日报"
            assert data["total_articles_processed"] == 10

    def test_get_digest_by_date(self, client):
        """Test getting digest by specific date"""
        mock_digest = {
            "id": 2,
            "date": "2026-04-08",
            "title": "AI资讯日报",
            "overview": "昨日AI领域重要进展",
            "sections": [],
            "total_articles_processed": 8,
            "anchor_count": 4,
            "created_at": "2026-04-08 08:00:00"
        }

        with patch("routers.digests.get_digest_by_date", return_value=mock_digest):
            response = client.get("/api/digests/2026-04-08")
            assert response.status_code == 200
            data = response.json()
            assert data["date"] == "2026-04-08"



class TestAISummarize:
    """Unit tests for AI summarization (with mocked client)"""

    def test_summarize_text_with_mocked_ai(self):
        """Test text summarization with mocked AI client"""
        mock_config = {
            "id": 1,
            "provider": "siliconflow",
            "api_key": "sk-test-mock",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Qwen/Qwen2.5-7B-Instruct",
            "updated_at": "2026-04-08 10:00:00"
        }

        with patch("services.ai.get_ai_config", return_value=mock_config):
            with patch("services.ai.AsyncOpenAI") as mock_client:
                mock_instance = AsyncMock()
                mock_response = AsyncMock()
                mock_response.choices = [AsyncMock(
                    message=AsyncMock(content="这是AI生成的测试总结内容")
                )]
                mock_instance.chat.completions.create = AsyncMock(return_value=mock_response)
                mock_client.return_value = mock_instance

                from services.ai import summarize_text
                import asyncio

                result = asyncio.run(summarize_text("测试标题", "这是测试内容"))
                assert result == "这是AI生成的测试总结内容"

    def test_summarize_text_without_config(self):
        """Test summarization fails gracefully without AI config"""
        with patch("services.ai.get_ai_config", return_value=None):
            from services.ai import summarize_text
            import asyncio

            result = asyncio.run(summarize_text("测试标题", "这是测试内容"))
            assert "AI 配置未完成" in result
