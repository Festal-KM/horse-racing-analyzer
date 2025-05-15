from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Race, RaceRead, Horse, HorseRead

router = APIRouter(prefix="/races", tags=["races"])


@router.get("/", response_model=List[RaceRead])
def get_races(
    session: Session = Depends(get_session),
    race_date: Optional[date] = Query(None, description="レース開催日（YYYY-MM-DD形式）"),
    venue: Optional[str] = Query(None, description="開催場"),
):
    """
    日付と開催場によるレース一覧を取得
    """
    query = select(Race)
    
    if race_date:
        query = query.where(Race.race_date == race_date)
    
    if venue:
        query = query.where(Race.venue == venue)
    
    # 日付順、レース番号順にソート
    query = query.order_by(Race.race_date, Race.race_number)
    
    races = session.exec(query).all()
    return races


@router.get("/{race_id}", response_model=dict)
def get_race_detail(
    race_id: int,
    session: Session = Depends(get_session)
):
    """
    レース詳細と出走馬リストを取得
    """
    race = session.get(Race, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    # 出走馬を取得
    horses_query = select(Horse).where(Horse.race_id == race_id).order_by(Horse.horse_number)
    horses = session.exec(horses_query).all()
    
    # レースと馬のデータを結合して返す
    return {
        "race": race,
        "horses": horses
    } 