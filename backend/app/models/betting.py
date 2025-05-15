from typing import Optional
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import Base, TimeStampMixin


class BettingResultBase(SQLModel):
    """馬券結果の基本属性"""
    race_id: int = Field(foreign_key="race.id", index=True)
    bet_type: str = Field(description="馬券種類", index=True)
    bet_numbers: str = Field(description="馬番組み合わせ")
    amount: int = Field(description="金額")
    is_won: bool = Field(default=False, description="的中フラグ", index=True)
    payout: Optional[int] = Field(default=None, description="払戻金")


class BettingResult(BettingResultBase, Base, TimeStampMixin, table=True):
    """馬券結果モデル"""
    race: "Race" = Relationship(back_populates="betting_results")


class BettingResultRead(BettingResultBase):
    """馬券結果読み取り用レスポンスモデル"""
    id: int


class BettingResultCreate(BettingResultBase):
    """馬券結果作成用リクエストモデル"""
    pass


class BettingResultUpdate(SQLModel):
    """馬券結果更新用リクエストモデル"""
    is_won: Optional[bool] = None
    payout: Optional[int] = None 