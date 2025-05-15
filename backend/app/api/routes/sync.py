from datetime import date
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlmodel import Session

from app.db import get_session
from app.services.scraper import JRAScraper

router = APIRouter(tags=["sync"])


@router.post("/sync", response_model=Dict)
async def sync_race_data(
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    target_date: date = Query(..., description="同期対象日（YYYY-MM-DD形式）"),
    force: bool = Query(False, description="強制的に再同期する"),
):
    """
    指定した日付のレースデータをJRAから同期
    """
    try:
        # バックグラウンドタスクとして実行する
        scraper = JRAScraper(session)
        background_tasks.add_task(scraper.sync_race_data, target_date, force)
        
        return {
            "status": "success",
            "message": f"同期処理を開始しました（日付: {target_date}, 強制モード: {force}）"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"同期処理の開始に失敗しました: {str(e)}"
        ) 