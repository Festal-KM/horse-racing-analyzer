# 競馬予想ツール - セキュリティガイド

## 概要

このドキュメントは、競馬予想ツールのセキュリティ対策と、実装されたセキュリティチェックツールの使用方法について説明しています。

## セキュリティツール

アプリケーションには以下のセキュリティチェックツールが実装されています：

1. **バックエンドセキュリティチェック** - Python依存パッケージの脆弱性とコードの静的解析を行います
2. **フロントエンドセキュリティチェック** - npm依存パッケージの脆弱性とESLintによるコードの静的解析を行います

## バックエンドセキュリティチェックの実行方法

### 前提条件

- Python 3.8以上
- 以下のパッケージのインストール:
  ```bash
  pip install safety bandit
  ```

### 実行方法

```bash
cd horse-racing-analyzer/backend
python scripts/security_check.py
```

### オプション

```
--project-dir PATH   プロジェクトディレクトリのパス (デフォルト: カレントディレクトリ)
--output PATH        出力ファイルのパス (デフォルト: PROJECT_DIR/security_reports/security_report.json)
```

### 出力

実行結果は以下の場所に保存されます：

- 依存パッケージの脆弱性: `security_reports/safety_report.json`
- コード静的解析: `security_reports/bandit_report.json`
- 統合レポート: `security_reports/security_report.json`

## フロントエンドセキュリティチェックの実行方法

### 前提条件

- Node.js 16以上
- npm 7以上
- 以下のパッケージのインストール:
  ```bash
  npm install -g snyk
  npm install eslint-plugin-security
  ```

### 実行方法

```bash
cd horse-racing-analyzer/frontend
npm run security
```

### 脆弱性の修正

検出された脆弱性を自動的に修正するには：

```bash
npm run security:fix
```

### 出力

実行結果は以下の場所に保存されます：

- npm audit結果: `security_reports/npm_audit_report.json`
- Snyk結果: `security_reports/snyk_report.json`
- ESLint結果: `security_reports/eslint_security_report.json`
- 統合レポート: `security_reports/security_report.json`

## OWASP Top 10対策

実装されたセキュリティチェックは、OWASP Top 10（2021）の脆弱性カテゴリに対してマッピングされています：

1. **A01:2021 - アクセス制御の不備**: 認証確認と権限検証
2. **A02:2021 - 暗号化の失敗**: 安全でない暗号アルゴリズムの使用検出
3. **A03:2021 - インジェクション**: SQL/コマンドインジェクションの検出
4. **A04:2021 - 安全でない設計**: 安全でないコード設計パターンの検出
5. **A05:2021 - セキュリティ設定ミス**: 安全でないデフォルト設定の検出
6. **A06:2021 - 脆弱で古いコンポーネント**: 依存パッケージの脆弱性検出
7. **A07:2021 - 認証の失敗**: 認証関連の脆弱性
8. **A08:2021 - ソフトウェアとデータの整合性の障害**: 整合性確認の不備
9. **A09:2021 - セキュリティログと監視の失敗**: ログ記録の確認
10. **A10:2021 - SSRF**: サーバーサイドリクエストフォージェリの検出

## 定期的なセキュリティチェック

以下のスケジュールでセキュリティチェックを実施することを推奨します：

1. 毎週の自動スキャン
2. 新しい依存パッケージの追加時
3. メジャーバージョンアップデート前
4. 本番環境へのデプロイ前

## CI/CDとの統合

GitHub Actionsワークフローにセキュリティチェックを統合する例：

```yaml
name: Security Check

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日に実行

jobs:
  backend-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install safety bandit
      - name: Run security check
        run: |
          cd backend
          python scripts/security_check.py

  frontend-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm install
          npm install -g snyk
      - name: Run security check
        run: |
          cd frontend
          npm run security
```

## セキュリティ対策のベストプラクティス

1. **アプリケーションレベル**:
   - 入力バリデーション
   - XSS対策
   - CSRF対策
   - レート制限
   - エラーメッセージの適切な処理

2. **インフラレベル**:
   - ファイアウォール設定
   - HTTPS強制
   - 安全なHTTPヘッダー設定
   - サーバーの最小権限設定

3. **開発プロセス**:
   - セキュアコーディングガイドラインの遵守
   - コードレビュー
   - セキュリティトレーニング
   - 依存関係の定期的な更新 