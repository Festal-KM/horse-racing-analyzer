from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Comment, CommentCreate, CommentRead, CommentUpdate

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("/", response_model=List[CommentRead])
def get_comments(
    session: Session = Depends(get_session),
    race_id: Optional[int] = Query(None, description="レースID"),
    horse_id: Optional[int] = Query(None, description="馬ID"),
):
    """
    コメント一覧を取得
    """
    query = select(Comment)
    
    if race_id:
        query = query.where(Comment.race_id == race_id)
    
    if horse_id:
        query = query.where(Comment.horse_id == horse_id)
    
    # 新しいコメント順にソート
    query = query.order_by(Comment.created_at.desc())
    
    comments = session.exec(query).all()
    return comments


@router.post("/", response_model=CommentRead)
def create_comment(
    comment: CommentCreate,
    session: Session = Depends(get_session),
):
    """
    新規コメントを作成
    """
    db_comment = Comment.from_orm(comment)
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment


@router.get("/{comment_id}", response_model=CommentRead)
def get_comment(
    comment_id: int,
    session: Session = Depends(get_session),
):
    """
    指定IDのコメントを取得
    """
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment


@router.put("/{comment_id}", response_model=CommentRead)
def update_comment(
    comment_id: int,
    comment_update: CommentUpdate,
    session: Session = Depends(get_session),
):
    """
    指定IDのコメントを更新
    """
    db_comment = session.get(Comment, comment_id)
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment_data = comment_update.dict(exclude_unset=True)
    for key, value in comment_data.items():
        setattr(db_comment, key, value)
    
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: int,
    session: Session = Depends(get_session),
):
    """
    指定IDのコメントを削除
    """
    db_comment = session.get(Comment, comment_id)
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    session.delete(db_comment)
    session.commit()
    return {"status": "success", "message": "Comment deleted successfully"} 