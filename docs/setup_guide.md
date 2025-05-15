# 競馬予想ツール セットアップガイド

本ドキュメントでは、競馬予想ツールのローカル開発環境の構築方法について説明します。

## 前提条件

以下のソフトウェアがインストールされていることを確認してください。

- Python 3.10以上
- Node.js 18.0以上
- npm または pnpm
- Git

## リポジトリのクローン

まず、Gitリポジトリをクローンします。

```bash
git clone https://github.com/your-username/horse-racing-analyzer.git
cd horse-racing-analyzer
```

## バックエンドのセットアップ

### 1. Poetry のインストール

[Poetry](https://python-poetry.org/) を使用して依存関係を管理します。まだインストールしていない場合は、以下のコマンドでインストールしてください。

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

Windowsでは:

```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

### 2. バックエンド依存関係のインストール

```bash
cd backend
poetry install
```

### 3. 環境変数の設定

`.env` ファイルをバックエンドディレクトリに作成します。

```bash
cp .env.example .env
```

必要に応じて `.env` ファイルを編集してください。

### 4. データベースのマイグレーション

初回起動前にデータベースのマイグレーションを実行します。

```bash
poetry run python -m app.db.migrations
```

### 5. バックエンドサーバーの起動

開発サーバーを起動します。

```bash
poetry run uvicorn app.main:app --reload
```

これで、バックエンドサーバーが http://localhost:8000 で起動します。

## フロントエンドのセットアップ

### 1. 依存関係のインストール

```bash
cd ../frontend
npm install  # または pnpm install
```

### 2. 環境変数の設定

`.env.local` ファイルをフロントエンドディレクトリに作成します。

```bash
cp .env.example .env.local
```

必要に応じて `.env.local` ファイルを編集してください。

### 3. 開発サーバーの起動

```bash
npm run dev  # または pnpm dev
```

これで、フロントエンドサーバーが http://localhost:3000 で起動します。

## テストの実行

### バックエンドテスト

```bash
cd backend
poetry run pytest
```

詳細なテスト結果を表示するには:

```bash
poetry run pytest -v
```

カバレッジレポートを生成するには:

```bash
poetry run pytest --cov=app --cov-report=html
```

### フロントエンドテスト

```bash
cd frontend
npm test  # または pnpm test
```

## API ドキュメント

FastAPIのSwagger UIを使用して、APIドキュメントにアクセスできます。

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## データの同期

初期データを取得するには、APIの `/sync` エンドポイントを呼び出します。

```bash
curl -X POST http://localhost:8000/sync -H "Content-Type: application/json" -d '{"force": false}'
```

または、フロントエンドのデータ更新ボタンを使用することもできます。

## トラブルシューティング

### 一般的な問題

#### 依存関係のエラー

```bash
# バックエンド
cd backend
poetry update

# フロントエンド
cd frontend
npm update  # または pnpm update
```

#### データベースのエラー

データベースが破損した場合は、以下の手順で再作成できます。

```bash
cd backend
rm horse_racing.db
poetry run python -m app.db.migrations
```

#### ポートの競合

既に使用されているポートでサーバーを起動しようとすると、エラーが発生します。別のポートを使用するには:

```bash
# バックエンド
poetry run uvicorn app.main:app --reload --port 8001

# フロントエンド
npm run dev -- --port 3001  # または pnpm dev --port 3001
```

## Docker 開発環境 (オプション)

Docker を使用して開発環境を構築することもできます。詳細は `docker/README.md` を参照してください。 