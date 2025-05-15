from datetime import date, datetime
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel

from app.models.base import Base, TimeStampMixin


class RaceBase(SQLModel):
    """レースの基本属性"""
    race_id: str = Field(index=True, description="JRA レースID")
    race_date: date = Field(index=True, description="開催日")
    venue: str = Field(index=True, description="開催場")
    race_number: int = Field(index=True, description="レース番号")
    race_name: str = Field(description="レース名")
    race_class: str = Field(description="クラス")
    course_type: str = Field(description="芝/ダート")
    distance: int = Field(description="距離(m)")
    weather: Optional[str] = Field(default=None, description="天候")
    track_condition: Optional[str] = Field(default=None, description="馬場状態")
    start_time: Optional[datetime] = Field(default=None, description="発走時刻")


class Race(RaceBase, Base, TimeStampMixin, table=True):
    """レースモデル"""
    horses: List["Horse"] = Relationship(back_populates="race")
    comments: List["Comment"] = Relationship(back_populates="race")
    betting_results: List["BettingResult"] = Relationship(back_populates="race")


class RaceRead(RaceBase):
    """レース読み取り用レスポンスモデル"""
    id: int


class RaceCreate(RaceBase):
    """レース作成用リクエストモデル"""
    pass


class RaceUpdate(SQLModel):
    """レース更新用リクエストモデル"""
    race_name: Optional[str] = None
    race_class: Optional[str] = None
    weather: Optional[str] = None
    track_condition: Optional[str] = None
    start_time: Optional[datetime] = None 