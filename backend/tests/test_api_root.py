from app.config import API_VERSION

def test_root_endpoint(client):
    """ルートエンドポイントが正しいレスポンスを返すことを確認するテスト"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Horse Racing Analyzer API", "version": API_VERSION} 