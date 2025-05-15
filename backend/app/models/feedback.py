from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Feedback(SQLModel, table=True):
    """
    ユーザーからのフィードバック情報モデル
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str] = None
    email: Optional[str] = None
    type: str  # bug, feature, improvement, other
    title: str
    description: str
    created_at: datetime = Field(default_factory=datetime.now)
    status: str = "new"  # new, reviewed, resolved, rejected
    admin_notes: Optional[str] = None 