#!/usr/bin/env python
"""
APIサーバーヘルスチェックスクリプト
APIエンドポイントの状態を監視し、レポートを生成します。
"""

import os
import sys
import json
import time
import logging
import argparse
import socket
import urllib.request
import urllib.error
from datetime import datetime

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('healthcheck')

class HealthChecker:
    """APIヘルスチェッカークラス"""
    
    def __init__(self, base_url, timeout=10):
        """
        初期化
        
        :param base_url: チェック対象のベースURL
        :param timeout: リクエストタイムアウト秒数
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'base_url': self.base_url,
            'status': 'unknown',
            'response_time': None,
            'endpoints': []
        }
    
    def check_endpoint(self, endpoint, method='GET', data=None, headers=None):
        """
        特定のエンドポイントをチェック
        
        :param endpoint: チェックするエンドポイント（/から始まる相対パス）
        :param method: HTTPメソッド
        :param data: POSTデータ（辞書）
        :param headers: リクエストヘッダー（辞書）
        :return: チェック結果の辞書
        """
        url = f"{self.base_url}{endpoint}"
        result = {
            'endpoint': endpoint,
            'method': method,
            'status': 'unknown',
            'status_code': None,
            'response_time': None,
            'error': None
        }
        
        try:
            # ヘッダー設定
            request_headers = {'User-Agent': 'APIHealthCheck/1.0'}
            if headers:
                request_headers.update(headers)
            
            # リクエスト作成
            req = urllib.request.Request(url, method=method, headers=request_headers)
            
            # POSTデータがある場合
            if data and method in ['POST', 'PUT']:
                post_data = json.dumps(data).encode('utf-8')
                req.add_header('Content-Type', 'application/json')
                req.data = post_data
            
            # タイミング開始
            start_time = time.time()
            
            # リクエスト送信
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                response_time = time.time() - start_time
                status_code = response.getcode()
                
                # レスポンスボディ読み込み（大きすぎる場合は制限）
                content = response.read(1024).decode('utf-8')
                
                result.update({
                    'status': 'healthy' if 200 <= status_code < 400 else 'unhealthy',
                    'status_code': status_code,
                    'response_time': round(response_time, 3),
                    'content_sample': content[:100] if len(content) > 0 else None
                })
        
        except urllib.error.HTTPError as e:
            response_time = time.time() - start_time
            result.update({
                'status': 'unhealthy',
                'status_code': e.code,
                'response_time': round(response_time, 3),
                'error': str(e)
            })
        
        except (urllib.error.URLError, socket.timeout) as e:
            result.update({
                'status': 'unreachable',
                'error': str(e)
            })
        
        except Exception as e:
            result.update({
                'status': 'error',
                'error': str(e)
            })
        
        logger.info(f"チェック結果: {endpoint} - {result['status']}")
        self.results['endpoints'].append(result)
        return result
    
    def run_checks(self, endpoints=None):
        """
        すべてのエンドポイントをチェック
        
        :param endpoints: チェックするエンドポイントのリスト。Noneの場合はデフォルトエンドポイント。
        :return: チェック結果の辞書
        """
        # デフォルトエンドポイント
        if endpoints is None:
            endpoints = [
                {'path': '/', 'method': 'GET'},
                {'path': '/races', 'method': 'GET'},
                {'path': '/comments', 'method': 'GET'},
                {'path': '/stats', 'method': 'GET'},
            ]
        
        # 基本的な接続チェック
        try:
            # タイミング開始
            start_time = time.time()
            
            # ルートエンドポイントをチェック
            root_result = self.check_endpoint('/')
            
            self.results['response_time'] = root_result['response_time']
            
            # 残りのエンドポイントをチェック
            for endpoint in endpoints:
                if endpoint['path'] != '/':  # ルートは既にチェック済み
                    self.check_endpoint(
                        endpoint['path'], 
                        method=endpoint.get('method', 'GET'),
                        data=endpoint.get('data'),
                        headers=endpoint.get('headers')
                    )
            
            # 全体的なステータスを決定
            healthy_count = sum(1 for ep in self.results['endpoints'] if ep['status'] == 'healthy')
            total_count = len(self.results['endpoints'])
            
            if healthy_count == total_count:
                self.results['status'] = 'healthy'
            elif healthy_count > 0:
                self.results['status'] = 'degraded'
            else:
                self.results['status'] = 'unhealthy'
            
        except Exception as e:
            logger.error(f"ヘルスチェック実行エラー: {str(e)}")
            self.results['status'] = 'error'
            self.results['error'] = str(e)
        
        return self.results
    
    def save_report(self, output_file):
        """
        チェック結果をJSONファイルに保存
        
        :param output_file: 出力ファイルパス
        """
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False)
            logger.info(f"レポートを保存しました: {output_file}")
            return True
        except Exception as e:
            logger.error(f"レポート保存エラー: {str(e)}")
            return False

def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(description='APIサーバーのヘルスチェックを実行')
    parser.add_argument('--url', type=str, required=True,
                        help='チェックするAPIのベースURL')
    parser.add_argument('--timeout', type=int, default=10,
                        help='リクエストタイムアウト秒数')
    parser.add_argument('--output', type=str, default='healthcheck_report.json',
                        help='レポート出力ファイルパス')
    
    args = parser.parse_args()
    
    try:
        # ヘルスチェック実行
        checker = HealthChecker(args.url, args.timeout)
        results = checker.run_checks()
        
        # 結果表示
        print(f"API Status: {results['status']}")
        print(f"Base URL: {results['base_url']}")
        print(f"Response Time: {results['response_time']} seconds")
        print("\nEndpoint Details:")
        for endpoint in results['endpoints']:
            print(f"  {endpoint['method']} {endpoint['endpoint']}: {endpoint['status']}")
        
        # レポート保存
        checker.save_report(args.output)
        
        # 終了コード設定
        if results['status'] == 'healthy':
            return 0
        elif results['status'] == 'degraded':
            return 1
        else:
            return 2
    
    except Exception as e:
        logger.error(f"実行エラー: {str(e)}")
        return 3

if __name__ == "__main__":
    sys.exit(main()) 