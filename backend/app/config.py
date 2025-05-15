import os
from pathlib import Path

# プロジェクトのルートディレクトリ
BASE_DIR = Path(__file__).resolve().parent.parent

# データベース設定
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/horse_racing.db")

# JRAスクレイピング関連
JRA_BASE_URL = "https://www.jra.go.jp"
MAX_RETRY_COUNT = 3
REQUEST_TIMEOUT = 10  # 秒

# APIドキュメント設定
API_TITLE = "Horse Racing Analyzer API"
API_DESCRIPTION = "競馬予想ツールのバックエンドAPI"
API_VERSION = "0.1.0"

# CORS設定
CORS_ORIGINS = [
    "http://localhost:3000",  # 開発環境フロントエンド
    "https://horse-racing-analyzer.vercel.app",  # 本番環境フロントエンド（仮）
] 