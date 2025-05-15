from datetime import datetime, date
import pytest
from sqlmodel import Session

from app.models import Race, Horse, Comment, Stats


@pytest.fixture
def test_data(session: Session):
    """テスト用のデータを作成"""
    # レースデータ
    races = [
        Race(
            id=1,
            race_name="テストレース1",
            race_date=date(2023, 5, 1),
            venue="東京",
            race_number=1,
            race_type="芝",
            distance=1600,
            weather="晴",
            track_condition="良"
        ),
        Race(
            id=2,
            race_name="テストレース2",
            race_date=date(2023, 5, 2),
            venue="京都",
            race_number=2,
            race_type="ダート",
            distance=1800,
            weather="曇",
            track_condition="稍重"
        )
    ]
    
    for race in races:
        session.add(race)
    
    # 馬データ
    horses = [
        Horse(
            id=1,
            race_id=1,
            horse_number=1,
            horse_name="テスト馬1",
            jockey="テスト騎手1",
            trainer="テスト調教師1",
            weight=480,
            sex="牡",
            age=3
        ),
        Horse(
            id=2,
            race_id=1,
            horse_number=2,
            horse_name="テスト馬2",
            jockey="テスト騎手2",
            trainer="テスト調教師2",
            weight=490,
            sex="牝",
            age=4
        ),
        Horse(
            id=3,
            race_id=2,
            horse_number=1,
            horse_name="テスト馬3",
            jockey="テスト騎手1", # 同じ騎手
            trainer="テスト調教師3",
            weight=500,
            sex="牡",
            age=5
        )
    ]
    
    for horse in horses:
        session.add(horse)
    
    # コメントデータ
    comments = [
        Comment(
            id=1,
            race_id=1,
            horse_id=1,
            comment_text="良さそう",
            rating=4,
            created_at=datetime.now()
        ),
        Comment(
            id=2,
            race_id=1,
            horse_id=2,
            comment_text="微妙",
            rating=2,
            created_at=datetime.now()
        ),
        Comment(
            id=3,
            race_id=2,
            horse_id=3,
            comment_text="期待",
            rating=5,
            created_at=datetime.now()
        )
    ]
    
    for comment in comments:
        session.add(comment)
    
    # 統計データ
    stats = [
        Stats(
            id=1,
            jockey="テスト騎手1",
            average_rating=4.5,
            comment_count=2,
            success_rate=0.75
        ),
        Stats(
            id=2,
            jockey="テスト騎手2",
            average_rating=2.0,
            comment_count=1,
            success_rate=0.0
        )
    ]
    
    for stat in stats:
        session.add(stat)
    
    session.commit()
    
    return {"races": races, "horses": horses, "comments": comments, "stats": stats}


def test_get_stats(client, test_data):
    """統計情報を取得するAPIのテスト"""
    response = client.get("/stats/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["jockey"] in ["テスト騎手1", "テスト騎手2"]
    assert data[1]["jockey"] in ["テスト騎手1", "テスト騎手2"]


def test_get_stats_by_jockey(client, test_data):
    """騎手名で統計情報をフィルタリングするAPIのテスト"""
    response = client.get("/stats/?jockey=テスト騎手1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["jockey"] == "テスト騎手1"
    assert data[0]["average_rating"] == 4.5
    assert data[0]["comment_count"] == 2


def test_get_jockey_stats(client, test_data):
    """騎手別の統計情報を取得するAPIのテスト"""
    response = client.get("/stats/jockeys")
    assert response.status_code == 200
    data = response.json()
    
    # 騎手データが含まれていることを確認
    jockeys = [item["jockey"] for item in data]
    assert "テスト騎手1" in jockeys
    assert "テスト騎手2" in jockeys


def test_get_venue_stats(client, test_data):
    """開催場別の統計情報を取得するAPIのテスト"""
    response = client.get("/stats/venues")
    assert response.status_code == 200
    data = response.json()
    
    # 開催場データが含まれていることを確認
    venues = [item["venue"] for item in data]
    assert "東京" in venues
    assert "京都" in venues


def test_get_recommendations(client, test_data):
    """レコメンデーション情報を取得するAPIのテスト"""
    response = client.get("/recommendations")
    assert response.status_code == 200
    data = response.json()
    
    # レコメンデーションデータの構造を確認
    assert "recommended_jockeys" in data
    assert "recommended_venues" in data
    assert isinstance(data["recommended_jockeys"], list)
    assert isinstance(data["recommended_venues"], list) 