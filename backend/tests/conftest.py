import pytest
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test database path before importing app
os.environ["TESTING"] = "1"


@pytest.fixture
def test_db_path(tmp_path):
    """Create a temporary test database"""
    return tmp_path / "test.db"
