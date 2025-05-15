from typing import Optional
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import Base, TimeStampMixin


class CommentBase(SQLModel):
    """コメントの基本属性"""
    race_id: int = Field(foreign_key="race.id", index=True)
    horse_id: int = Field(foreign_key="horse.id", index=True)
    content: str = Field(description="コメント内容")
    is_public: bool = Field(default=False, description="公開フラグ")


class Comment(CommentBase, Base, TimeStampMixin, table=True):
    """コメントモデル"""
    race: "Race" = Relationship(back_populates="comments")
    horse: "Horse" = Relationship(back_populates="comments")


class CommentRead(CommentBase):
    """コメント読み取り用レスポンスモデル"""
    id: int


class CommentCreate(CommentBase):
    """コメント作成用リクエストモデル"""
    pass


class CommentUpdate(SQLModel):
    """コメント更新用リクエストモデル"""
    content: Optional[str] = None
    is_public: Optional[bool] = None 