from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sentry_sdk

from app.config import API_TITLE, API_DESCRIPTION, API_VERSION, CORS_ORIGINS
from app.db import create_db_and_tables
from app.api.routes import races, comments, stats, sync
from app.api import feedback

# Sentryの初期化（本番環境のみ）
if os.environ.get('ENV') == 'production':
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN', ''),
        traces_sample_rate=1.0,
        environment="production",
        profiles_sample_rate=0.2,
        # 各ユーザーを追跡するための設定（オプション）
        enable_tracing=True,
    )

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
async def root():
    return {"message": "Horse Racing Analyzer API", "version": API_VERSION}

# APIルーターを登録
app.include_router(races.router)
app.include_router(comments.router)
app.include_router(stats.router)
app.include_router(sync.router)
app.include_router(feedback.router)

# 今後ルーターをインポートして追加する
# from app.api.routes import races, comments, stats
# app.include_router(races.router)
# app.include_router(comments.router)
# app.include_router(stats.router) 