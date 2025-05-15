#!/usr/bin/env python
"""
APIパフォーマンステストスクリプト
APIエンドポイントの応答時間を測定し、パフォーマンスレポートを生成します。
"""

import sys
import json
import time
import logging
import argparse
import statistics
import concurrent.futures
from datetime import datetime
from urllib.parse import urljoin
import requests
from requests.exceptions import RequestException

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('performance_test')

class APIPerformanceTester:
    """APIパフォーマンステスト実行クラス"""
    
    def __init__(self, base_url, num_requests=100, concurrency=10, timeout=10):
        """
        初期化
        
        :param base_url: テスト対象のベースURL
        :param num_requests: 各エンドポイントに対して実行するリクエスト数
        :param concurrency: 同時実行するリクエスト数
        :param timeout: リクエストタイムアウト秒数
        """
        self.base_url = base_url.rstrip('/')
        self.num_requests = num_requests
        self.concurrency = concurrency
        self.timeout = timeout
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'base_url': self.base_url,
            'configuration': {
                'num_requests': num_requests,
                'concurrency': concurrency,
                'timeout': timeout
            },
            'endpoints': []
        }
    
    def test_endpoint(self, endpoint, method='GET', data=None, headers=None):
        """
        特定のエンドポイントをテスト
        
        :param endpoint: テストするエンドポイント（/から始まる相対パス）
        :param method: HTTPメソッド
        :param data: POSTデータ（辞書）
        :param headers: リクエストヘッダー（辞書）
        :return: テスト結果の辞書
        """
        url = urljoin(self.base_url, endpoint)
        result = {
            'endpoint': endpoint,
            'method': method,
            'num_requests': self.num_requests,
            'successful_requests': 0,
            'failed_requests': 0,
            'response_times': [],
            'min_time': None,
            'max_time': None,
            'mean_time': None,
            'median_time': None,
            'p95_time': None,
            'p99_time': None,
            'requests_per_second': 0,
            'errors': []
        }
        
        # リクエスト送信関数
        def send_request():
            try:
                start_time = time.time()
                
                if method == 'GET':
                    response = requests.get(url, headers=headers, timeout=self.timeout)
                elif method == 'POST':
                    response = requests.post(url, json=data, headers=headers, timeout=self.timeout)
                elif method == 'PUT':
                    response = requests.put(url, json=data, headers=headers, timeout=self.timeout)
                elif method == 'DELETE':
                    response = requests.delete(url, headers=headers, timeout=self.timeout)
                else:
                    raise ValueError(f"サポートされていないHTTPメソッド: {method}")
                
                response_time = time.time() - start_time
                
                return {
                    'status_code': response.status_code,
                    'response_time': response_time,
                    'success': 200 <= response.status_code < 400
                }
            except RequestException as e:
                return {
                    'status_code': None,
                    'response_time': None,
                    'success': False,
                    'error': str(e)
                }
        
        # テスト実行開始時間
        start_test_time = time.time()
        
        # マルチスレッドでリクエスト送信
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            # 複数のリクエストを同時に実行
            futures = [executor.submit(send_request) for _ in range(self.num_requests)]
            
            # 結果を収集
            for future in concurrent.futures.as_completed(futures):
                request_result = future.result()
                
                if request_result.get('success', False):
                    result['successful_requests'] += 1
                    result['response_times'].append(request_result['response_time'])
                else:
                    result['failed_requests'] += 1
                    error = {
                        'status_code': request_result.get('status_code'),
                        'error': request_result.get('error', 'Unknown error')
                    }
                    result['errors'].append(error)
        
        # テスト終了時間
        end_test_time = time.time()
        
        # 結果を計算
        if result['response_times']:
            result['min_time'] = min(result['response_times'])
            result['max_time'] = max(result['response_times'])
            result['mean_time'] = statistics.mean(result['response_times'])
            result['median_time'] = statistics.median(result['response_times'])
            
            # パーセンタイル計算
            sorted_times = sorted(result['response_times'])
            p95_index = int(len(sorted_times) * 0.95)
            p99_index = int(len(sorted_times) * 0.99)
            result['p95_time'] = sorted_times[p95_index]
            result['p99_time'] = sorted_times[p99_index]
            
            # 1秒あたりのリクエスト数計算
            test_duration = end_test_time - start_test_time
            result['requests_per_second'] = self.num_requests / test_duration if test_duration > 0 else 0
        
        # 小数点以下3桁に丸める
        for key in ['min_time', 'max_time', 'mean_time', 'median_time', 'p95_time', 'p99_time', 'requests_per_second']:
            if result[key] is not None:
                result[key] = round(result[key], 3)
        
        logger.info(f"テスト完了: {endpoint} - 成功: {result['successful_requests']}, 失敗: {result['failed_requests']}")
        self.results['endpoints'].append(result)
        return result
    
    def run_tests(self, endpoints=None):
        """
        すべてのエンドポイントをテスト
        
        :param endpoints: テストするエンドポイントのリスト。Noneの場合はデフォルトエンドポイント。
        :return: テスト結果の辞書
        """
        # デフォルトエンドポイント
        if endpoints is None:
            endpoints = [
                {'path': '/', 'method': 'GET'},
                {'path': '/races', 'method': 'GET'},
                {'path': '/comments', 'method': 'GET'},
                {'path': '/stats', 'method': 'GET'},
                {'path': '/stats/jockeys', 'method': 'GET'},
                {'path': '/stats/venues', 'method': 'GET'},
                {'path': '/recommendations', 'method': 'GET'},
            ]
        
        logger.info(f"パフォーマンステスト開始: {self.base_url}")
        logger.info(f"設定: リクエスト数={self.num_requests}, 同時実行数={self.concurrency}")
        
        # 全体のテスト開始時間
        overall_start_time = time.time()
        
        try:
            # 各エンドポイントをテスト
            for endpoint in endpoints:
                logger.info(f"エンドポイントをテスト中: {endpoint['path']}")
                self.test_endpoint(
                    endpoint['path'], 
                    method=endpoint.get('method', 'GET'),
                    data=endpoint.get('data'),
                    headers=endpoint.get('headers')
                )
            
            # 全体のテスト終了時間
            overall_end_time = time.time()
            
            # 全体のテスト時間
            self.results['total_test_time'] = round(overall_end_time - overall_start_time, 3)
            
            # 全体の統計を計算
            all_response_times = []
            total_successful = 0
            total_failed = 0
            
            for endpoint_result in self.results['endpoints']:
                all_response_times.extend(endpoint_result['response_times'])
                total_successful += endpoint_result['successful_requests']
                total_failed += endpoint_result['failed_requests']
            
            if all_response_times:
                self.results['summary'] = {
                    'total_requests': total_successful + total_failed,
                    'successful_requests': total_successful,
                    'failed_requests': total_failed,
                    'success_rate': round(total_successful / (total_successful + total_failed) * 100, 2),
                    'min_time': round(min(all_response_times), 3),
                    'max_time': round(max(all_response_times), 3),
                    'mean_time': round(statistics.mean(all_response_times), 3),
                    'median_time': round(statistics.median(all_response_times), 3),
                }
                
                # パーセンタイル計算
                sorted_times = sorted(all_response_times)
                p95_index = int(len(sorted_times) * 0.95)
                p99_index = int(len(sorted_times) * 0.99)
                self.results['summary']['p95_time'] = round(sorted_times[p95_index], 3)
                self.results['summary']['p99_time'] = round(sorted_times[p99_index], 3)
            
            logger.info(f"全エンドポイントのテストが完了しました")
        
        except Exception as e:
            logger.error(f"テスト実行エラー: {str(e)}")
            self.results['error'] = str(e)
        
        return self.results
    
    def save_report(self, output_file):
        """
        テスト結果をJSONファイルに保存
        
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
    parser = argparse.ArgumentParser(description='APIパフォーマンステストを実行')
    parser.add_argument('--url', type=str, required=True,
                        help='テスト対象のAPIのベースURL')
    parser.add_argument('--requests', type=int, default=100,
                        help='各エンドポイントに対して実行するリクエスト数')
    parser.add_argument('--concurrency', type=int, default=10,
                        help='同時実行するリクエスト数')
    parser.add_argument('--timeout', type=int, default=10,
                        help='リクエストタイムアウト秒数')
    parser.add_argument('--output', type=str, default='performance_report.json',
                        help='レポート出力ファイルパス')
    
    args = parser.parse_args()
    
    try:
        # パフォーマンステスト実行
        tester = APIPerformanceTester(args.url, args.requests, args.concurrency, args.timeout)
        results = tester.run_tests()
        
        # 結果サマリーを表示
        if 'summary' in results:
            print("\nパフォーマンステスト結果サマリー:")
            print(f"テスト対象: {results['base_url']}")
            print(f"総リクエスト数: {results['summary']['total_requests']}")
            print(f"成功率: {results['summary']['success_rate']}%")
            print(f"最短応答時間: {results['summary']['min_time']}秒")
            print(f"最長応答時間: {results['summary']['max_time']}秒")
            print(f"平均応答時間: {results['summary']['mean_time']}秒")
            print(f"中央値応答時間: {results['summary']['median_time']}秒")
            print(f"95パーセンタイル: {results['summary']['p95_time']}秒")
            print(f"99パーセンタイル: {results['summary']['p99_time']}秒")
            print(f"総テスト時間: {results['total_test_time']}秒\n")
            
            print("エンドポイント別の結果:")
            for endpoint in results['endpoints']:
                print(f"  {endpoint['method']} {endpoint['endpoint']}")
                print(f"    成功: {endpoint['successful_requests']}")
                print(f"    平均応答時間: {endpoint['mean_time']}秒")
                print(f"    リクエスト/秒: {endpoint['requests_per_second']}")
        
        # レポート保存
        tester.save_report(args.output)
        
        return 0
    
    except Exception as e:
        logger.error(f"実行エラー: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 