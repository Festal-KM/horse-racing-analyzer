from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func

from app.db import get_session
from app.models import (
    Stats, StatsRead, Race, BettingResult
)

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=List[StatsRead])
def get_stats(
    session: Session = Depends(get_session),
    category: Optional[str] = Query(None, description="カテゴリ（venue, course_type, race_class, etc）"),
    start_date: Optional[date] = Query(None, description="集計開始日"),
    end_date: Optional[date] = Query(None, description="集計終了日"),
):
    """
    条件別の統計情報を取得
    """
    query = select(Stats)
    
    if category:
        query = query.where(Stats.category == category)
    
    if start_date:
        query = query.where(Stats.calculated_at >= start_date)
        
    if end_date:
        query = query.where(Stats.calculated_at <= end_date)
    
    # ROI降順でソート
    query = query.order_by(Stats.roi.desc())
    
    stats = session.exec(query).all()
    return stats


@router.get("/kpi", response_model=Dict)
def get_kpi(
    session: Session = Depends(get_session),
    start_date: Optional[date] = Query(None, description="集計開始日"),
    end_date: Optional[date] = Query(None, description="集計終了日"),
):
    """
    KPI情報（回収率、的中率、ベット数）を取得
    """
    query = select(
        func.sum(BettingResult.amount).label("total_bet"),
        func.sum(BettingResult.payout).label("total_payout"),
        func.count(BettingResult.id).label("bet_count"),
        func.sum(func.cast(BettingResult.is_won, int)).label("win_count")
    )
    
    if start_date or end_date:
        # Race情報とジョインして日付でフィルタ
        query = query.join(Race, BettingResult.race_id == Race.id)
        
        if start_date:
            query = query.where(Race.race_date >= start_date)
        
        if end_date:
            query = query.where(Race.race_date <= end_date)
    
    result = session.exec(query).one()
    
    total_bet = result.total_bet or 0
    total_payout = result.total_payout or 0
    bet_count = result.bet_count or 0
    win_count = result.win_count or 0
    
    # 0除算を防ぐ
    roi = (total_payout / total_bet * 100) if total_bet > 0 else 0
    win_rate = (win_count / bet_count * 100) if bet_count > 0 else 0
    
    return {
        "roi": round(roi, 2),
        "win_rate": round(win_rate, 2),
        "bet_count": bet_count,
        "total_bet": total_bet,
        "total_payout": total_payout
    }


@router.get("/recommendations", response_model=List[Dict])
def get_recommendations(
    session: Session = Depends(get_session),
    target_date: date = Query(..., description="対象日（YYYY-MM-DD形式）"),
):
    """
    高回収率が期待できるレースを推薦
    自己平均回収率+10pt以上、最低ベット数30以上の条件を抽出し、当日のレースを推薦
    """
    # 1. 条件別の統計から良好な条件を抽出
    roi_threshold = 10  # 平均+10pt以上
    min_bet_count = 30  # 最低ベット数
    
    # 平均ROIを取得
    avg_roi_query = select(func.avg(Stats.roi))
    avg_roi = session.exec(avg_roi_query).one() or 100  # デフォルト100%
    
    # 良好な条件を取得
    good_conditions_query = select(Stats).where(
        Stats.roi >= avg_roi + roi_threshold,
        Stats.bet_count >= min_bet_count
    ).order_by(Stats.roi.desc())
    
    good_conditions = session.exec(good_conditions_query).all()
    
    # 2. 当日のレースを取得
    today_races_query = select(Race).where(Race.race_date == target_date)
    today_races = session.exec(today_races_query).all()
    
    recommendations = []
    
    # 3. 良好な条件に合致するレースをフィルタリング
    for race in today_races:
        for condition in good_conditions:
            match = False
            
            # カテゴリと条件のマッチング
            if condition.category == "venue" and condition.condition == race.venue:
                match = True
            elif condition.category == "course_type" and condition.condition == race.course_type:
                match = True
            elif condition.category == "race_class" and condition.condition == race.race_class:
                match = True
            
            if match:
                recommendations.append({
                    "race": race,
                    "condition": {
                        "category": condition.category,
                        "condition": condition.condition,
                        "roi": condition.roi,
                        "bet_count": condition.bet_count,
                        "win_count": condition.win_count
                    }
                })
                break  # 1つのレースに対して複数条件のマッチは避ける
    
    # 発走時刻順にソート
    recommendations.sort(key=lambda x: x["race"].start_time or date.max)
    
    return recommendations 