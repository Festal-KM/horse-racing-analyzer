from sqlmodel import Session, SQLModel, create_engine

from app.config import DATABASE_URL
from app.models import *  # noqa

# エンジンを作成
engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables():
    """データベースとテーブルを作成する"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """DBセッションを取得する"""
    with Session(engine) as session:
        yield session 