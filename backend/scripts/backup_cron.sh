#!/bin/bash
# 競馬予想ツール データベースバックアップCronジョブ
# 使用例: crontab -e で以下を追加
# 0 0 * * 0 /path/to/backup_cron.sh > /path/to/backup.log 2>&1

# 変数設定
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${APP_DIR}/backup"
DB_PATH="${APP_DIR}/horse_racing.db"
S3_BUCKET="your-s3-bucket-name"
S3_PREFIX="horse-racing-backups/"

# 日付
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="${SCRIPT_DIR}/backup_${DATE}.log"

# ログ関数
log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

# エラーハンドリング
handle_error() {
  log "エラー: $1"
  exit 1
}

# 開始メッセージ
log "バックアップ処理を開始します..."

# 必要なディレクトリが存在することを確認
if [ ! -d "$BACKUP_DIR" ]; then
  mkdir -p "$BACKUP_DIR" || handle_error "バックアップディレクトリの作成に失敗しました"
  log "バックアップディレクトリを作成しました: $BACKUP_DIR"
fi

# データベースの存在確認
if [ ! -f "$DB_PATH" ]; then
  handle_error "データベースファイルが見つかりません: $DB_PATH"
fi

# バックアップ作成
log "ローカルバックアップを作成しています..."
python3 "${SCRIPT_DIR}/backup.py" --db-path "$DB_PATH" --backup-dir "$BACKUP_DIR" || handle_error "ローカルバックアップの作成に失敗しました"

# S3アップロード（boto3がインストールされている場合）
if command -v pip3 &> /dev/null && pip3 list | grep -q boto3; then
  log "S3へのアップロードを実行しています..."
  python3 "${SCRIPT_DIR}/s3_backup.py" --backup-dir "$BACKUP_DIR" --s3-bucket "$S3_BUCKET" --s3-prefix "$S3_PREFIX" --latest-only || handle_error "S3アップロードに失敗しました"
else
  log "警告: boto3がインストールされていないため、S3アップロードをスキップします"
fi

# 完了メッセージ
log "バックアップ処理が完了しました"
exit 0 