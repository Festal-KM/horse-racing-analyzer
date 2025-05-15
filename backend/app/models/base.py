from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class TimeStampMixin(SQLModel):
    """タイムスタンプ用Mixin"""
    created_at: datetime = Field(default_factory=datetime.now, index=True)
    updated_at: datetime = Field(default_factory=datetime.now, index=True)


class Base(SQLModel):
    """すべてのモデルの基底クラス"""
    id: Optional[int] = Field(default=None, primary_key=True) 