#!/usr/bin/env python
"""
セキュリティチェックスクリプト
Python依存パッケージの脆弱性をチェックし、レポートを生成します。
SafetyとBanditを使用して、依存関係と静的コード解析を行います。
"""

import sys
import os
import subprocess
import json
import argparse
import logging
from datetime import datetime

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('security_check')

class SecurityChecker:
    """セキュリティチェック実行クラス"""
    
    def __init__(self, project_dir):
        """
        初期化
        
        :param project_dir: チェック対象のプロジェクトディレクトリ
        """
        self.project_dir = os.path.abspath(project_dir)
        self.output_dir = os.path.join(self.project_dir, 'security_reports')
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'project_dir': self.project_dir,
            'dependency_check': None,
            'code_analysis': None
        }
        
        # 出力ディレクトリがなければ作成
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def check_dependencies(self):
        """
        Safetyを使用して依存パッケージの脆弱性をチェック
        
        :return: 脆弱性チェック結果
        """
        logger.info("依存パッケージの脆弱性チェックを開始します")
        
        # requirements.txtパスの取得
        requirements_path = os.path.join(self.project_dir, 'requirements.txt')
        
        # Safety CLIがインストールされているか確認
        try:
            subprocess.run(["safety", "--version"], 
                          check=True, 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE)
        except (subprocess.SubprocessError, FileNotFoundError):
            logger.error("Safety CLIがインストールされていません。'pip install safety'でインストールしてください。")
            return {'error': 'Safety CLI not installed'}
        
        # requirements.txtが存在するか確認
        if not os.path.exists(requirements_path):
            logger.error(f"requirements.txtファイルが見つかりません: {requirements_path}")
            return {'error': 'requirements.txt not found'}
        
        try:
            # Safetyを実行してJSON形式で結果を取得
            safety_output_path = os.path.join(self.output_dir, 'safety_report.json')
            
            cmd = [
                "safety", "check",
                "-r", requirements_path,
                "--json",
                "--output", safety_output_path
            ]
            
            process = subprocess.run(
                cmd,
                check=False,  # エラーコードが0以外でも例外を発生させない
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Safetyの終了コードが0でなくても続行（脆弱性が見つかった場合は非ゼロを返す）
            if os.path.exists(safety_output_path):
                with open(safety_output_path, 'r') as f:
                    safety_data = json.load(f)
                
                # 結果の整形
                vulnerabilities = []
                
                if 'vulnerabilities' in safety_data:
                    for vuln in safety_data['vulnerabilities']:
                        vulnerabilities.append({
                            'package': vuln.get('package_name'),
                            'installed_version': vuln.get('installed_version'),
                            'vulnerable_versions': vuln.get('vulnerable_spec'),
                            'description': vuln.get('advisory'),
                            'severity': vuln.get('severity', 'unknown'),
                            'cve': vuln.get('cve')
                        })
                
                result = {
                    'scan_successful': True,
                    'vulnerabilities_found': len(vulnerabilities),
                    'vulnerabilities': vulnerabilities,
                    'report_file': safety_output_path
                }
                
                logger.info(f"依存パッケージのチェックが完了しました。脆弱性: {len(vulnerabilities)}件")
                return result
            else:
                logger.error("Safetyレポートファイルが生成されませんでした")
                return {
                    'scan_successful': False,
                    'error': 'Safety report not generated'
                }
                
        except Exception as e:
            logger.error(f"依存パッケージチェック中にエラーが発生しました: {str(e)}")
            return {
                'scan_successful': False,
                'error': str(e)
            }

    def analyze_code(self):
        """
        Banditを使用してコードの静的解析を実行
        
        :return: コード解析結果
        """
        logger.info("コードの静的セキュリティ解析を開始します")
        
        # Bandit CLIがインストールされているか確認
        try:
            subprocess.run(["bandit", "--version"], 
                          check=True, 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE)
        except (subprocess.SubprocessError, FileNotFoundError):
            logger.error("Bandit CLIがインストールされていません。'pip install bandit'でインストールしてください。")
            return {'error': 'Bandit CLI not installed'}
        
        try:
            # アプリケーションコードのディレクトリ
            app_dir = os.path.join(self.project_dir, 'app')
            
            # app ディレクトリが存在するか確認
            if not os.path.exists(app_dir):
                logger.error(f"アプリケーションディレクトリが見つかりません: {app_dir}")
                return {'error': 'Application directory not found'}
            
            # Banditを実行してJSON形式で結果を取得
            bandit_output_path = os.path.join(self.output_dir, 'bandit_report.json')
            
            cmd = [
                "bandit",
                "-r", app_dir,
                "-f", "json",
                "-o", bandit_output_path
            ]
            
            process = subprocess.run(
                cmd,
                check=False,  # エラーコードが0以外でも例外を発生させない
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Banditレポートが生成されたか確認
            if os.path.exists(bandit_output_path):
                with open(bandit_output_path, 'r') as f:
                    bandit_data = json.load(f)
                
                # 結果の整形
                issues = []
                metrics = bandit_data.get('metrics', {})
                
                for result in bandit_data.get('results', []):
                    issues.append({
                        'file': result.get('filename'),
                        'line': result.get('line_number'),
                        'issue_id': result.get('test_id'),
                        'issue_name': result.get('test_name'),
                        'severity': result.get('issue_severity'),
                        'confidence': result.get('issue_confidence'),
                        'description': result.get('issue_text')
                    })
                
                # 深刻度別の問題数
                severity_counts = {
                    'HIGH': 0,
                    'MEDIUM': 0,
                    'LOW': 0
                }
                
                for issue in issues:
                    severity = issue.get('severity', '').upper()
                    if severity in severity_counts:
                        severity_counts[severity] += 1
                
                result = {
                    'scan_successful': True,
                    'issues_found': len(issues),
                    'issues_by_severity': severity_counts,
                    'issues': issues,
                    'report_file': bandit_output_path,
                    'metrics': metrics
                }
                
                logger.info(f"コード解析が完了しました。検出された問題: {len(issues)}件")
                return result
            else:
                logger.error("Banditレポートファイルが生成されませんでした")
                return {
                    'scan_successful': False,
                    'error': 'Bandit report not generated'
                }
                
        except Exception as e:
            logger.error(f"コード解析中にエラーが発生しました: {str(e)}")
            return {
                'scan_successful': False,
                'error': str(e)
            }
    
    def run_checks(self):
        """
        全セキュリティチェックを実行
        
        :return: チェック結果の辞書
        """
        logger.info(f"セキュリティチェック開始: {self.project_dir}")
        
        try:
            # 依存パッケージチェック
            self.results['dependency_check'] = self.check_dependencies()
            
            # コード静的解析
            self.results['code_analysis'] = self.analyze_code()
            
            # OWASP Top 10カテゴリ別のチェック結果を整理
            self.results['owasp_coverage'] = self.categorize_by_owasp()
            
            logger.info("全セキュリティチェックが完了しました")
        
        except Exception as e:
            logger.error(f"セキュリティチェック実行エラー: {str(e)}")
            self.results['error'] = str(e)
        
        return self.results
    
    def categorize_by_owasp(self):
        """
        検出された問題をOWASP Top 10カテゴリに分類
        
        :return: OWASP Top 10カテゴリ別の問題数
        """
        # OWASP Top 10 (2021) カテゴリ
        owasp_categories = {
            'A01:2021-Broken Access Control': [],
            'A02:2021-Cryptographic Failures': [],
            'A03:2021-Injection': [],
            'A04:2021-Insecure Design': [],
            'A05:2021-Security Misconfiguration': [],
            'A06:2021-Vulnerable Components': [],
            'A07:2021-Auth Failures': [],
            'A08:2021-Software Data Integrity Failures': [],
            'A09:2021-Logging Failures': [],
            'A10:2021-SSRF': []
        }
        
        # Banditの問題マッピング（単純化したもの）
        bandit_to_owasp = {
            'B101': 'A04:2021-Insecure Design',  # assert used
            'B102': 'A03:2021-Injection',  # exec used
            'B103': 'A03:2021-Injection',  # pickle used
            'B104': 'A03:2021-Injection',  # hardcoded bind all
            'B105': 'A02:2021-Cryptographic Failures',  # hardcoded password string
            'B106': 'A02:2021-Cryptographic Failures',  # hardcoded password func
            'B107': 'A02:2021-Cryptographic Failures',  # hardcoded password default
            'B108': 'A04:2021-Insecure Design',  # hardcoded tmp dir
            'B109': 'A01:2021-Broken Access Control',  # password default
            'B110': 'A03:2021-Injection',  # try-except-pass
            'B111': 'A05:2021-Security Misconfiguration',  # execute with run_as_root
            'B112': 'A03:2021-Injection',  # try-except-continue
            'B201': 'A03:2021-Injection',  # flask debug mode
            'B301': 'A03:2021-Injection',  # pickle
            'B302': 'A03:2021-Injection',  # marshal
            'B303': 'A03:2021-Injection',  # md5
            'B304': 'A03:2021-Injection',  # ciphers
            'B305': 'A02:2021-Cryptographic Failures',  # cipher modes
            'B306': 'A02:2021-Cryptographic Failures',  # mktemp_q
            'B307': 'A03:2021-Injection',  # eval
            'B308': 'A03:2021-Injection',  # mark_safe
            'B309': 'A03:2021-Injection',  # httpsconnection
            'B310': 'A03:2021-Injection',  # urllib_urlopen
            'B311': 'A02:2021-Cryptographic Failures',  # random
            'B312': 'A03:2021-Injection',  # telnetlib
            'B313': 'A03:2021-Injection',  # xml bad cElementTree
            'B314': 'A03:2021-Injection',  # xml bad minidom
            'B315': 'A03:2021-Injection',  # xml bad pulldom
            'B316': 'A03:2021-Injection',  # xml bad sax
            'B317': 'A03:2021-Injection',  # xml bad expatreader
            'B318': 'A03:2021-Injection',  # xml bad expatbuilder
            'B319': 'A03:2021-Injection',  # xml bad minify
            'B320': 'A03:2021-Injection',  # xml bad iterparse
            'B321': 'A03:2021-Injection',  # ftplib
            'B322': 'A03:2021-Injection',  # input
            'B323': 'A03:2021-Injection',  # unverified context
            'B324': 'A03:2021-Injection',  # hashlib insecure
            'B325': 'A03:2021-Injection',  # tempnam
            'B401': 'A03:2021-Injection',  # import telnetlib
            'B402': 'A02:2021-Cryptographic Failures',  # import ftplib
            'B403': 'A03:2021-Injection',  # import pickle
            'B404': 'A03:2021-Injection',  # import subprocess
            'B405': 'A03:2021-Injection',  # import xml.etree
            'B406': 'A03:2021-Injection',  # import xml.sax
            'B407': 'A03:2021-Injection',  # import xml.expat
            'B408': 'A03:2021-Injection',  # import xml.minidom
            'B409': 'A03:2021-Injection',  # import xml.pulldom
            'B410': 'A03:2021-Injection',  # import lxml
            'B411': 'A03:2021-Injection',  # import xmlrpclib
            'B412': 'A03:2021-Injection',  # import httplib
            'B413': 'A03:2021-Injection',  # import urllib.request
            'B414': 'A03:2021-Injection',  # import pycrypto
            'B501': 'A01:2021-Broken Access Control',  # request with no cert validation
            'B502': 'A03:2021-Injection',  # request with cert validation disabled
            'B503': 'A03:2021-Injection',  # ssl with bad defaults
            'B504': 'A03:2021-Injection',  # ssl with no version
            'B505': 'A02:2021-Cryptographic Failures',  # weak cryptographic key
            'B506': 'A05:2021-Security Misconfiguration',  # yaml load
            'B507': 'A03:2021-Injection',  # ssh no host key verification
            'B508': 'A03:2021-Injection',  # snmp v3 no security
            'B509': 'A03:2021-Injection',  # snmp v3 no integrity
            'B510': 'A03:2021-Injection',  # snmp v3 no privacy
            'B608': 'A03:2021-Injection',  # hardcoded sql statements
            'B609': 'A03:2021-Injection',  # linux commands wildcard injection
            'B610': 'A03:2021-Injection',  # django extra used
            'B611': 'A03:2021-Injection',  # django rawsql used
            'B701': 'A03:2021-Injection',  # jinja2 autoescape false
            'B702': 'A03:2021-Injection',  # use of mako templates
            'B703': 'A03:2021-Injection',  # django mark_safe
        }
        
        # 依存パッケージの脆弱性はすべてA06に分類
        if self.results.get('dependency_check', {}).get('scan_successful'):
            vulnerabilities = self.results['dependency_check'].get('vulnerabilities', [])
            for vuln in vulnerabilities:
                owasp_categories['A06:2021-Vulnerable Components'].append({
                    'source': 'dependency_check',
                    'package': vuln.get('package'),
                    'version': vuln.get('installed_version'),
                    'description': vuln.get('description'),
                    'severity': vuln.get('severity')
                })
        
        # 静的コード解析の問題をOWASP Top 10に分類
        if self.results.get('code_analysis', {}).get('scan_successful'):
            issues = self.results['code_analysis'].get('issues', [])
            for issue in issues:
                issue_id = issue.get('issue_id')
                owasp_category = bandit_to_owasp.get(issue_id, 'A04:2021-Insecure Design')  # デフォルトはA04
                
                owasp_categories[owasp_category].append({
                    'source': 'code_analysis',
                    'issue_id': issue_id,
                    'file': issue.get('file'),
                    'line': issue.get('line'),
                    'description': issue.get('description'),
                    'severity': issue.get('severity')
                })
        
        # カテゴリごとの問題数を集計
        category_counts = {}
        for category, issues in owasp_categories.items():
            category_counts[category] = len(issues)
        
        return {
            'category_counts': category_counts,
            'issues_by_category': owasp_categories
        }
    
    def save_report(self, output_file=None):
        """
        テスト結果をJSONファイルに保存
        
        :param output_file: 出力ファイルパス
        """
        if output_file is None:
            output_file = os.path.join(self.output_dir, 'security_report.json')
        
        try:
            with open(output_file, 'w') as f:
                json.dump(self.results, f, indent=2)
            
            logger.info(f"セキュリティレポートを保存しました: {output_file}")
            return True
        except Exception as e:
            logger.error(f"レポート保存エラー: {str(e)}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Python依存パッケージの脆弱性とコードのセキュリティをチェックします')
    parser.add_argument('--project-dir', default='.', help='プロジェクトディレクトリのパス (デフォルト: カレントディレクトリ)')
    parser.add_argument('--output', help='出力ファイルのパス (デフォルト: PROJECT_DIR/security_reports/security_report.json)')
    args = parser.parse_args()
    
    checker = SecurityChecker(args.project_dir)
    results = checker.run_checks()
    
    # レポート保存
    checker.save_report(args.output)
    
    # 結果サマリーを表示
    vulnerability_count = results.get('dependency_check', {}).get('vulnerabilities_found', 0)
    code_issues_count = results.get('code_analysis', {}).get('issues_found', 0)
    
    print("\n=== セキュリティチェック結果サマリー ===")
    print(f"依存パッケージの脆弱性: {vulnerability_count}件")
    print(f"コードセキュリティの問題: {code_issues_count}件")
    print(f"合計問題数: {vulnerability_count + code_issues_count}件")
    
    # OWASP Top 10カテゴリ別の問題数
    if 'owasp_coverage' in results and 'category_counts' in results['owasp_coverage']:
        print("\nOWASP Top 10 (2021) カテゴリ別の問題数:")
        for category, count in results['owasp_coverage']['category_counts'].items():
            if count > 0:
                print(f"- {category}: {count}件")
    
    print(f"\n詳細レポート: {os.path.abspath(args.output if args.output else os.path.join(checker.output_dir, 'security_report.json'))}")
    
    # 重大な脆弱性があればエラーコードを返す
    high_vulnerabilities = sum(1 for v in results.get('dependency_check', {}).get('vulnerabilities', []) 
                              if v.get('severity') == 'high' or v.get('severity') == 'critical')
    high_code_issues = results.get('code_analysis', {}).get('issues_by_severity', {}).get('HIGH', 0)
    
    if high_vulnerabilities + high_code_issues > 0:
        print(f"\n警告: 重大な脆弱性が{high_vulnerabilities + high_code_issues}件見つかりました！")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 