import pytest
from datetime import date
from unittest.mock import patch, MagicMock, AsyncMock

from sqlmodel import Session

from app.services.scraper import JRAScraper


@pytest.fixture
def mock_httpx_client():
    """httpxクライアントのモック"""
    with patch("httpx.AsyncClient") as mock_client:
        client_instance = AsyncMock()
        mock_client.return_value = client_instance
        
        # レスポンスの設定
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        client_instance.get.return_value = mock_response
        
        yield client_instance, mock_response


@pytest.fixture
def mock_scraper(session, mock_httpx_client):
    """JRAScraperのモックインスタンス"""
    client, response = mock_httpx_client
    scraper = JRAScraper(session)
    scraper.client = client
    return scraper, response


class TestJRAScraper:
    """JRAScraperのテストクラス"""
    
    @pytest.mark.asyncio
    async def test_fetch_races_list(self, mock_scraper):
        """レース一覧取得のテスト"""
        scraper, response = mock_scraper
        
        # モックレスポンスのHTMLを設定
        html_content = """
        <div class="race_table">
            <div class="race_place">東京</div>
            <tr class="race_data">
                <td class="race_num">1R</td>
                <td><a href="race/result.html?race_id=202305010101">レース詳細</a></td>
            </tr>
        </div>
        """
        response.text = html_content
        
        # メソッド実行
        result = await scraper._fetch_races_list(date(2023, 5, 1))
        
        # 結果検証
        assert len(result) == 1
        assert result[0]["venue"] == "東京"
        assert result[0]["race_number"] == 1
        assert result[0]["race_id"] == "202305010101"
    
    @pytest.mark.asyncio
    async def test_sync_race_data_skip_existing(self, mock_scraper, session):
        """既存データがある場合のスキップテスト"""
        scraper, _ = mock_scraper
        
        # 既存レースを追加（モック）
        with patch("sqlmodel.Session.exec") as mock_exec:
            mock_exec.return_value.all.return_value = [MagicMock()]  # 何かしらのレースが存在する
            
            # メソッド実行
            result = await scraper.sync_race_data(date(2023, 5, 1), force=False)
            
            # 結果の検証
            assert result["status"] == "skipped"
    
    @pytest.mark.asyncio
    async def test_sync_race_data_force(self, mock_scraper):
        """強制同期モードのテスト"""
        scraper, _ = mock_scraper
        
        # 各メソッドをモック化
        scraper._fetch_races_list = AsyncMock(return_value=[
            {"race_id": "202305010101", "venue": "東京", "race_number": 1}
        ])
        scraper._fetch_race_detail = AsyncMock(return_value={})
        scraper._fetch_odds = AsyncMock(return_value={})
        scraper._save_race_data = MagicMock()
        scraper.close = AsyncMock()
        
        # exec結果のモック化
        with patch("sqlmodel.Session.exec") as mock_exec:
            mock_exec.return_value.all.return_value = []  # レースがない状態
            
            # メソッド実行
            result = await scraper.sync_race_data(date(2023, 5, 1), force=True)
            
            # 結果の検証
            assert result["status"] == "success"
            scraper._fetch_race_detail.assert_called_once()
            scraper._fetch_odds.assert_called_once()
            scraper._save_race_data.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_sync_race_data_no_data(self, mock_scraper):
        """レースデータがない場合のテスト"""
        scraper, _ = mock_scraper
        
        # レース一覧が空の場合
        scraper._fetch_races_list = AsyncMock(return_value=[])
        scraper.close = AsyncMock()
        
        # メソッド実行
        result = await scraper.sync_race_data(date(2023, 5, 1))
        
        # 結果の検証
        assert result["status"] == "no_data"
    
    @pytest.mark.asyncio
    async def test_sync_race_data_error(self, mock_scraper):
        """エラー処理のテスト"""
        scraper, _ = mock_scraper
        
        # レース一覧で例外発生
        scraper._fetch_races_list = AsyncMock(side_effect=Exception("テストエラー"))
        scraper.close = AsyncMock()
        
        # メソッド実行とエラー検証
        with pytest.raises(Exception) as exc_info:
            await scraper.sync_race_data(date(2023, 5, 1))
        
        assert "テストエラー" in str(exc_info.value) 