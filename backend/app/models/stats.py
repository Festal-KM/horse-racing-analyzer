from datetime import date
from typing import Optional
from sqlmodel import Field, SQLModel

from app.models.base import Base, TimeStampMixin


class StatsBase(SQLModel):
    """統計の基本属性"""
    category: str = Field(index=True, description="カテゴリ")
    condition: str = Field(index=True, description="条件")
    bet_count: int = Field(description="ベット数")
    win_count: int = Field(description="的中数")
    total_bet: int = Field(description="総投票額")
    total_payout: int = Field(description="総払戻額")
    roi: float = Field(description="回収率")
    calculated_at: date = Field(index=True, description="計算日")


class Stats(StatsBase, Base, TimeStampMixin, table=True):
    """統計モデル"""
    pass


class StatsRead(StatsBase):
    """統計読み取り用レスポンスモデル"""
    id: int


class StatsCreate(StatsBase):
    """統計作成用リクエストモデル"""
    pass


class StatsUpdate(SQLModel):
    """統計更新用リクエストモデル"""
    bet_count: Optional[int] = None
    win_count: Optional[int] = None
    total_bet: Optional[int] = None
    total_payout: Optional[int] = None
    roi: Optional[float] = None
    calculated_at: Optional[date] = None 