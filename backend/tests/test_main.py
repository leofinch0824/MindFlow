import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Tests for health check endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        from main import app
        return TestClient(app)

    def test_root_endpoint(self, client):
        """Test root endpoint returns correct info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "AI News Aggregator API"
        assert data["version"] == "1.0.0"

    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
