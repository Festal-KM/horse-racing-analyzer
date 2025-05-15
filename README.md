# 競馬予想ツール (Horse Racing Analyzer)

自身の「レース回顧型予想スタイル」を効率化・体系化するための専用Webアプリケーション。コメント・データ管理の煩雑さを解消します。

## 機能

- JRA全場・全レースの情報自動取得（スクレイピング）
- レース一覧・詳細表示（開催場・日付でフィルタリング可能）
- 出走馬ごとのコメント入力・管理（5段階評価付き）
- 予想結果の統計分析ダッシュボード（騎手・開催場・条件別の成績）
- 得意条件のレコメンデーション機能
- コメントのオートセーブ機能（入力中データの保護）
- レスポンシブデザイン（モバイル対応）

## 技術スタック

### フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Chakra UI
- Zustand (状態管理)
- SWR (データフェッチング)
- Jest + React Testing Library (テスト)
- Playwright (E2Eテスト)

### バックエンド
- FastAPI
- SQLModel + SQLite
- Pydantic
- httpx + BeautifulSoup4 (スクレイピング)
- pytest (テスト)

### インフラ
- Vercel (フロントエンド)
- Render.com (バックエンド)
- GitHub Actions (CI/CD)

## ドキュメント

詳細なドキュメントは以下を参照してください：

- [セットアップガイド](docs/setup_guide.md) - インストールと初期設定
- [API仕様書](docs/api_docs.md) - バックエンドAPI詳細
- [データベース設計](docs/database_diagram.md) - ER図とテーブル定義
- [開発計画](plan.md) - 実装ステータスと予定

## クイックスタート

### フロントエンド

```bash
cd frontend
npm install  # または pnpm install
npm run dev  # または pnpm dev
```

### バックエンド

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

## スクリーンショット

（準備中）

## 開発状況

現在はMVP（最小機能製品）の開発段階です。[plan.md](plan.md)で進捗状況を確認できます。

## コントリビューション

Pull Requestやissueは大歓迎です。大きな変更を加える前には、まずissueを開いて議論してください。

## ライセンス

個人利用のみ 