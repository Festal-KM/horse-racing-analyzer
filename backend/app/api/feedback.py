from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.db import get_session
from app.models.feedback import Feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])

class FeedbackCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    type: str
    title: str
    description: str

@router.post("/", response_model=Feedback)
def create_feedback(feedback: FeedbackCreate, session: Session = Depends(get_session)):
    """
    フィードバック情報を登録する
    """
    try:
        db_feedback = Feedback(
            name=feedback.name,
            email=feedback.email,
            type=feedback.type,
            title=feedback.title,
            description=feedback.description,
            created_at=datetime.now(),
            status="new"
        )
        
        session.add(db_feedback)
        session.commit()
        session.refresh(db_feedback)
        
        return db_feedback
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"フィードバック登録中にエラーが発生しました: {str(e)}")

@router.get("/", response_model=list[Feedback])
def get_all_feedback(session: Session = Depends(get_session)):
    """
    すべてのフィードバック情報を取得する (管理者向け)
    """
    feedbacks = session.exec(select(Feedback).order_by(Feedback.created_at.desc())).all()
    return feedbacks 