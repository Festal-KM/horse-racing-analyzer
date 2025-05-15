from datetime import datetime
import pytest
from sqlmodel import Session

from app.models import Race, Horse, Comment


@pytest.fixture
def test_race(session: Session):
    """テスト用のレースデータを作成"""
    race = Race(
        id=1,
        race_name="テストレース",
        race_date=datetime.now().date(),
        venue="東京",
        race_number=1,
        race_type="芝",
        distance=1600,
        weather="晴",
        track_condition="良"
    )
    session.add(race)
    session.commit()
    return race


@pytest.fixture
def test_horses(session: Session, test_race):
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
        )
    ]
    
    for horse in horses:
        session.add(horse)
    session.commit()
    
    return horses


@pytest.fixture
def test_comments(session: Session, test_race, test_horses):
    """テスト用のコメントデータを作成"""
    comments = [
        Comment(
            id=1,
            race_id=1,
            horse_id=1,
            comment_text="テストコメント1",
            rating=4,
            created_at=datetime.now()
        ),
        Comment(
            id=2,
            race_id=1,
            horse_id=2,
            comment_text="テストコメント2",
            rating=3,
            created_at=datetime.now()
        )
    ]
    
    for comment in comments:
        session.add(comment)
    session.commit()
    
    return comments


def test_get_comments(client, test_comments):
    """コメント一覧を取得するAPIのテスト"""
    response = client.get("/comments/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_comments_by_race_id(client, test_comments):
    """レースIDでフィルタリングしたコメント一覧を取得するAPIのテスト"""
    response = client.get("/comments/?race_id=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(comment["race_id"] == 1 for comment in data)


def test_get_comments_by_horse_id(client, test_comments):
    """馬IDでフィルタリングしたコメント一覧を取得するAPIのテスト"""
    response = client.get("/comments/?horse_id=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["horse_id"] == 1


def test_create_comment(client, test_race, test_horses):
    """新規コメントを作成するAPIのテスト"""
    comment_data = {
        "race_id": 1,
        "horse_id": 1,
        "comment_text": "新規テストコメント",
        "rating": 5
    }
    
    response = client.post("/comments/", json=comment_data)
    assert response.status_code == 200
    data = response.json()
    assert data["comment_text"] == "新規テストコメント"
    assert data["rating"] == 5


def test_get_comment(client, test_comments):
    """指定IDのコメントを取得するAPIのテスト"""
    response = client.get("/comments/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["comment_text"] == "テストコメント1"


def test_get_comment_not_found(client):
    """存在しないコメントIDを指定した場合のテスト"""
    response = client.get("/comments/999")
    assert response.status_code == 404


def test_update_comment(client, test_comments):
    """指定IDのコメントを更新するAPIのテスト"""
    update_data = {
        "comment_text": "更新されたコメント",
        "rating": 2
    }
    
    response = client.put("/comments/1", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["comment_text"] == "更新されたコメント"
    assert data["rating"] == 2


def test_update_comment_not_found(client):
    """存在しないコメントIDを更新しようとした場合のテスト"""
    update_data = {"comment_text": "更新されたコメント"}
    response = client.put("/comments/999", json=update_data)
    assert response.status_code == 404


def test_delete_comment(client, test_comments):
    """指定IDのコメントを削除するAPIのテスト"""
    response = client.delete("/comments/1")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    
    # 削除後に取得しようとすると404エラーになることを確認
    response = client.get("/comments/1")
    assert response.status_code == 404 