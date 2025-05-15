from datetime import date
import pytest
from sqlmodel import Session

from app.models import Race, Horse


@pytest.fixture
def test_races(session: Session):
    """テスト用のレースデータを作成"""
    race1 = Race(
        id=1,
        race_name="テストレース1",
        race_date=date(2023, 5, 1),
        venue="東京",
        race_number=1,
        race_type="芝",
        distance=1600,
        weather="晴",
        track_condition="良"
    )
    
    race2 = Race(
        id=2,
        race_name="テストレース2",
        race_date=date(2023, 5, 1),
        venue="京都",
        race_number=2,
        race_type="ダート",
        distance=1800,
        weather="曇",
        track_condition="稍重"
    )
    
    session.add(race1)
    session.add(race2)
    session.commit()
    
    return [race1, race2]


@pytest.fixture
def test_horses(session: Session, test_races):
    """テスト用の出走馬データを作成"""
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
            jockey="テスト騎手3",
            trainer="テスト調教師3",
            weight=500,
            sex="牡",
            age=5
        )
    ]
    
    for horse in horses:
        session.add(horse)
    session.commit()
    
    return horses


def test_get_races(client, test_races):
    """レース一覧を取得するAPIのテスト"""
    response = client.get("/races/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["race_name"] == "テストレース1"
    assert data[1]["race_name"] == "テストレース2"


def test_get_races_with_date_filter(client, test_races):
    """日付フィルターでレース一覧を取得するAPIのテスト"""
    response = client.get("/races/?race_date=2023-05-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_races_with_venue_filter(client, test_races):
    """開催場フィルターでレース一覧を取得するAPIのテスト"""
    response = client.get("/races/?venue=東京")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["venue"] == "東京"


def test_get_race_detail(client, test_races, test_horses):
    """レース詳細を取得するAPIのテスト"""
    response = client.get("/races/1")
    assert response.status_code == 200
    data = response.json()
    
    # レース情報の確認
    assert data["race"]["id"] == 1
    assert data["race"]["race_name"] == "テストレース1"
    
    # 出走馬情報の確認
    assert len(data["horses"]) == 2
    assert data["horses"][0]["horse_name"] == "テスト馬1"
    assert data["horses"][1]["horse_name"] == "テスト馬2"


def test_get_race_detail_not_found(client):
    """存在しないレースIDを指定した場合のテスト"""
    response = client.get("/races/999")
    assert response.status_code == 404 