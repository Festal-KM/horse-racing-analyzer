from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import Base, TimeStampMixin


class HorseBase(SQLModel):
    """馬の基本属性"""
    race_id: int = Field(foreign_key="race.id", index=True)
    horse_id: str = Field(index=True, description="JRA 馬ID")
    horse_name: str = Field(index=True, description="馬名")
    horse_number: int = Field(description="馬番")
    jockey: str = Field(index=True, description="騎手名")
    trainer: str = Field(index=True, description="調教師名")
    weight: Optional[float] = Field(default=None, description="馬体重(kg)")
    odds: Optional[float] = Field(default=None, description="単勝オッズ")
    result_order: Optional[int] = Field(default=None, description="着順")
    result_time: Optional[float] = Field(default=None, description="タイム(秒)")
    result_margin: Optional[str] = Field(default=None, description="着差")
    result_corner_position: Optional[str] = Field(default=None, description="コーナー通過位置")


class Horse(HorseBase, Base, TimeStampMixin, table=True):
    """馬モデル"""
    race: "Race" = Relationship(back_populates="horses")
    past_races: List["HorsePastRace"] = Relationship(back_populates="horse")
    comments: List["Comment"] = Relationship(back_populates="horse")


class HorseRead(HorseBase):
    """馬読み取り用レスポンスモデル"""
    id: int


class HorseCreate(HorseBase):
    """馬作成用リクエストモデル"""
    pass


class HorseUpdate(SQLModel):
    """馬更新用リクエストモデル"""
    weight: Optional[float] = None
    odds: Optional[float] = None
    result_order: Optional[int] = None
    result_time: Optional[float] = None
    result_margin: Optional[str] = None
    result_corner_position: Optional[str] = None


class HorsePastRaceBase(SQLModel):
    """馬の過去レース基本属性"""
    horse_id: int = Field(foreign_key="horse.id", index=True)
    race_date: str = Field(description="開催日")
    venue: str = Field(description="開催場")
    race_name: str = Field(description="レース名")
    result_order: Optional[int] = Field(default=None, description="着順")
    horse_count: Optional[int] = Field(default=None, description="出走頭数")
    jockey: str = Field(description="騎手名")
    weight: Optional[int] = Field(default=None, description="馬体重")
    course_condition: Optional[str] = Field(default=None, description="馬場状態")
    memo: Optional[str] = Field(default=None, description="メモ")


class HorsePastRace(HorsePastRaceBase, Base, TimeStampMixin, table=True):
    """馬の過去レースモデル"""
    horse: Horse = Relationship(back_populates="past_races") 