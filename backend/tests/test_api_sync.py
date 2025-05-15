import pytest
from unittest.mock import patch, MagicMock

from app.services.scraper import JRAScraper


def test_sync_endpoint(client):
    """同期エンドポイントの基本的なテスト"""
    # JRAScraperのメソッドをモック化
    with patch.object(JRAScraper, 'sync_race_data', return_value={"races_added": 5, "horses_added": 30}) as mock_sync:
        response = client.post("/sync", json={"force": False})
        assert response.status_code == 200
        
        # レスポンスの構造を確認
        data = response.json()
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        assert "races_added" in data["data"]
        assert "horses_added" in data["data"]
        
        # モックが呼ばれたことを確認
        mock_sync.assert_called_once()


def test_sync_endpoint_with_force(client):
    """強制同期オプションのテスト"""
    # JRAScraperのメソッドをモック化
    with patch.object(JRAScraper, 'sync_race_data', return_value={"races_added": 10, "horses_added": 60}) as mock_sync:
        response = client.post("/sync", json={"force": True})
        assert response.status_code == 200
        
        # 強制同期パラメータが正しく渡されたことを確認
        mock_sync.assert_called_once_with(force=True)


def test_sync_endpoint_error(client):
    """エラー発生時のテスト"""
    # JRAScraperのメソッドをモック化して例外を発生させる
    with patch.object(JRAScraper, 'sync_race_data', side_effect=Exception("同期エラー")) as mock_sync:
        response = client.post("/sync", json={"force": False})
        
        # エラーレスポンスの確認
        assert response.status_code == 500
        data = response.json()
        assert "success" in data
        assert data["success"] is False
        assert "error" in data 