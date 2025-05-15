#!/usr/bin/env python
"""
S3バックアップスクリプト
データベースのバックアップをAWS S3にアップロードします。
"""

import os
import sys
import logging
import argparse
import boto3
from botocore.exceptions import ClientError
from datetime import datetime

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('s3_backup')

def upload_to_s3(file_path, bucket, object_name=None):
    """
    ファイルをS3バケットにアップロードする
    
    :param file_path: アップロードするローカルファイルのパス
    :param bucket: アップロード先のS3バケット名
    :param object_name: S3オブジェクト名。未指定の場合はファイル名
    :return: アップロードが成功したかどうか
    """
    # S3オブジェクト名が指定されていない場合はファイル名を使用
    if object_name is None:
        object_name = os.path.basename(file_path)
    
    # S3クライアント作成
    s3_client = boto3.client('s3')
    
    try:
        logger.info(f"S3 ({bucket}) にアップロード中: {file_path} -> {object_name}")
        s3_client.upload_file(file_path, bucket, object_name)
        return True
    except ClientError as e:
        logger.error(f"S3アップロードエラー: {str(e)}")
        return False

def list_backups_in_directory(backup_dir):
    """
    指定ディレクトリ内のバックアップファイルを一覧表示
    
    :param backup_dir: バックアップファイルが格納されているディレクトリ
    :return: バックアップファイルのリスト（フルパス）
    """
    if not os.path.exists(backup_dir):
        logger.error(f"バックアップディレクトリが存在しません: {backup_dir}")
        return []
    
    backup_files = [
        os.path.join(backup_dir, f) for f in os.listdir(backup_dir)
        if f.startswith("horse_racing_db_backup_") and f.endswith(".db")
    ]
    
    return backup_files

def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(description='データベースバックアップをS3にアップロードします')
    parser.add_argument('--backup-dir', type=str, default='backup',
                        help='バックアップファイルが格納されているディレクトリ')
    parser.add_argument('--s3-bucket', type=str, required=True,
                        help='バックアップをアップロードするS3バケット名')
    parser.add_argument('--s3-prefix', type=str, default='db_backups/',
                        help='S3内のプレフィックス（フォルダパス）')
    parser.add_argument('--latest-only', action='store_true',
                        help='最新のバックアップファイルのみをアップロード')
    
    args = parser.parse_args()
    
    try:
        # バックアップディレクトリからファイル一覧取得
        backup_files = list_backups_in_directory(args.backup_dir)
        
        if not backup_files:
            logger.error("アップロードするバックアップファイルが見つかりません")
            return 1
        
        # 最新のみ指定されている場合は、最新のファイルだけ抽出
        if args.latest_only:
            backup_files = sorted(backup_files, key=os.path.getctime)
            backup_files = [backup_files[-1]]
            logger.info(f"最新のバックアップファイルのみアップロード: {backup_files[0]}")
        
        success_count = 0
        # ファイルをS3にアップロード
        for file_path in backup_files:
            file_name = os.path.basename(file_path)
            s3_object_name = f"{args.s3_prefix}{file_name}"
            
            if upload_to_s3(file_path, args.s3_bucket, s3_object_name):
                logger.info(f"アップロード成功: {file_name}")
                success_count += 1
            else:
                logger.error(f"アップロード失敗: {file_name}")
        
        logger.info(f"合計: {success_count}/{len(backup_files)} ファイルをアップロードしました")
        
        if success_count == len(backup_files):
            return 0
        else:
            return 1
    
    except Exception as e:
        logger.error(f"S3バックアップ処理中にエラーが発生しました: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 