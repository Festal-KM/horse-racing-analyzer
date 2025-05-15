#!/usr/bin/env python
"""
データベースバックアップスクリプト
週次でデータベースをバックアップし、指定されたストレージに保存します。
"""

import os
import shutil
import datetime
import sqlite3
import argparse
import logging
from pathlib import Path

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('db_backup')

def create_backup(db_path, backup_dir, max_backups=7):
    """データベースのバックアップを作成する"""
    try:
        # バックアップディレクトリが存在しない場合は作成
        Path(backup_dir).mkdir(parents=True, exist_ok=True)
        
        # 現在の日時を含むバックアップファイル名を生成
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"horse_racing_db_backup_{timestamp}.db"
        backup_path = os.path.join(backup_dir, backup_filename)
        
        # データベースファイルをコピー
        shutil.copy2(db_path, backup_path)
        logger.info(f"バックアップを作成しました: {backup_path}")
        
        # 古いバックアップを削除（最大数を超える場合）
        cleanup_old_backups(backup_dir, max_backups)
        
        return backup_path
    except Exception as e:
        logger.error(f"バックアップ作成エラー: {str(e)}")
        raise

def cleanup_old_backups(backup_dir, max_backups):
    """古いバックアップファイルを削除する"""
    try:
        # バックアップファイルを作成日時で並べ替え
        backup_files = sorted(
            [os.path.join(backup_dir, f) for f in os.listdir(backup_dir) 
             if f.startswith("horse_racing_db_backup_") and f.endswith(".db")],
            key=os.path.getctime
        )
        
        # 最大数を超える古いファイルを削除
        if len(backup_files) > max_backups:
            files_to_delete = backup_files[:-max_backups]
            for file_path in files_to_delete:
                os.remove(file_path)
                logger.info(f"古いバックアップを削除しました: {file_path}")
    except Exception as e:
        logger.error(f"古いバックアップ削除エラー: {str(e)}")

def verify_backup(original_db_path, backup_path):
    """バックアップが正常に作成されたことを検証する"""
    try:
        # 元のDBとバックアップのサイズを比較
        original_size = os.path.getsize(original_db_path)
        backup_size = os.path.getsize(backup_path)
        
        if original_size != backup_size:
            logger.warning(f"バックアップサイズが元のDBと異なります: {original_size} vs {backup_size}")
        
        # バックアップが開けるかテスト
        conn = sqlite3.connect(backup_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()
        conn.close()
        
        if result[0] == "ok":
            logger.info("バックアップの整合性チェックに成功しました")
            return True
        else:
            logger.error(f"バックアップの整合性チェックに失敗しました: {result[0]}")
            return False
    except Exception as e:
        logger.error(f"バックアップ検証エラー: {str(e)}")
        return False

def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(description='SQLiteデータベースのバックアップを作成します')
    parser.add_argument('--db-path', type=str, default='horse_racing.db', 
                        help='バックアップするデータベースファイルのパス')
    parser.add_argument('--backup-dir', type=str, default='backup', 
                        help='バックアップの保存先ディレクトリ')
    parser.add_argument('--max-backups', type=int, default=7, 
                        help='保持するバックアップの最大数')
    
    args = parser.parse_args()
    
    try:
        # データベースファイルの存在確認
        if not os.path.exists(args.db_path):
            logger.error(f"データベースファイルが見つかりません: {args.db_path}")
            return 1
        
        # バックアップ作成
        backup_path = create_backup(args.db_path, args.backup_dir, args.max_backups)
        
        # バックアップ検証
        if verify_backup(args.db_path, backup_path):
            logger.info("バックアップが正常に作成されました")
            return 0
        else:
            logger.error("バックアップの検証に失敗しました")
            return 1
    except Exception as e:
        logger.error(f"バックアップ処理中にエラーが発生しました: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main()) 