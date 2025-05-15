# 競馬予想ツール API 仕様書

## 概要

競馬予想ツールのバックエンドAPIは、レース情報・出走馬・コメント・統計データを管理するためのRESTful APIです。FastAPIフレームワークを使用して実装されています。

## ベースURL

開発環境: `http://localhost:8000`  
本番環境: 未定 (Render.comにデプロイ予定)

## 認証

現在のバージョンでは認証は実装されていません。将来のバージョンでJWT認証の実装を予定しています。

## API エンドポイント

### ルートエンドポイント

```
GET /
```

アプリケーションのヘルスチェックとバージョン情報を返します。

**レスポンス例**:
```json
{
  "message": "Horse Racing Analyzer API",
  "version": "0.1.0"
}
```

### レース関連 API

#### レース一覧の取得

```
GET /races/
```

**クエリパラメータ**:
- `race_date` (任意): 指定日付のレースのみを返します (YYYY-MM-DD形式)
- `venue` (任意): 指定開催場のレースのみを返します

**レスポンス例**:
```json
[
  {
    "id": 1,
    "race_name": "第1レース",
    "race_date": "2023-05-01",
    "venue": "東京",
    "race_number": 1,
    "race_type": "芝",
    "distance": 1600,
    "weather": "晴",
    "track_condition": "良"
  },
  {
    "id": 2,
    "race_name": "第2レース",
    "race_date": "2023-05-01",
    "venue": "京都",
    "race_number": 2,
    "race_type": "ダート",
    "distance": 1800,
    "weather": "曇",
    "track_condition": "稍重"
  }
]
```

#### レース詳細の取得

```
GET /races/{race_id}
```

**パスパラメータ**:
- `race_id`: レースID

**レスポンス例**:
```json
{
  "race": {
    "id": 1,
    "race_name": "第1レース",
    "race_date": "2023-05-01",
    "venue": "東京",
    "race_number": 1,
    "race_type": "芝",
    "distance": 1600,
    "weather": "晴",
    "track_condition": "良"
  },
  "horses": [
    {
      "id": 1,
      "race_id": 1,
      "horse_number": 1,
      "horse_name": "テスト馬1",
      "jockey": "テスト騎手1",
      "trainer": "テスト調教師1",
      "weight": 480,
      "sex": "牡",
      "age": 3
    },
    {
      "id": 2,
      "race_id": 1,
      "horse_number": 2,
      "horse_name": "テスト馬2",
      "jockey": "テスト騎手2",
      "trainer": "テスト調教師2",
      "weight": 490,
      "sex": "牝",
      "age": 4
    }
  ]
}
```

### コメント関連 API

#### コメント一覧の取得

```
GET /comments/
```

**クエリパラメータ**:
- `race_id` (任意): 指定レースIDのコメントのみを返します
- `horse_id` (任意): 指定馬IDのコメントのみを返します

**レスポンス例**:
```json
[
  {
    "id": 1,
    "race_id": 1,
    "horse_id": 1,
    "comment_text": "良さそう",
    "rating": 4,
    "created_at": "2023-05-01T12:34:56.789Z"
  },
  {
    "id": 2,
    "race_id": 1,
    "horse_id": 2,
    "comment_text": "微妙",
    "rating": 2,
    "created_at": "2023-05-01T12:35:00.000Z"
  }
]
```

#### コメントの作成

```
POST /comments/
```

**リクエストボディ**:
```json
{
  "race_id": 1,
  "horse_id": 1,
  "comment_text": "新規コメント",
  "rating": 5
}
```

**レスポンス例**:
```json
{
  "id": 3,
  "race_id": 1,
  "horse_id": 1,
  "comment_text": "新規コメント",
  "rating": 5,
  "created_at": "2023-05-01T13:00:00.000Z"
}
```

#### コメント詳細の取得

```
GET /comments/{comment_id}
```

**パスパラメータ**:
- `comment_id`: コメントID

**レスポンス例**:
```json
{
  "id": 1,
  "race_id": 1,
  "horse_id": 1,
  "comment_text": "良さそう",
  "rating": 4,
  "created_at": "2023-05-01T12:34:56.789Z"
}
```

#### コメントの更新

```
PUT /comments/{comment_id}
```

**パスパラメータ**:
- `comment_id`: コメントID

**リクエストボディ**:
```json
{
  "comment_text": "更新後のコメント",
  "rating": 3
}
```

**レスポンス例**:
```json
{
  "id": 1,
  "race_id": 1,
  "horse_id": 1,
  "comment_text": "更新後のコメント",
  "rating": 3,
  "created_at": "2023-05-01T12:34:56.789Z"
}
```

#### コメントの削除

```
DELETE /comments/{comment_id}
```

**パスパラメータ**:
- `comment_id`: コメントID

**レスポンス例**:
```json
{
  "status": "success",
  "message": "Comment deleted successfully"
}
```

### 統計関連 API

#### 統計データの取得

```
GET /stats/
```

**クエリパラメータ**:
- `jockey` (任意): 指定騎手の統計のみを返します

**レスポンス例**:
```json
[
  {
    "id": 1,
    "jockey": "テスト騎手1",
    "average_rating": 4.5,
    "comment_count": 2,
    "success_rate": 0.75
  },
  {
    "id": 2,
    "jockey": "テスト騎手2",
    "average_rating": 2.0,
    "comment_count": 1,
    "success_rate": 0.0
  }
]
```

#### 騎手別統計の取得

```
GET /stats/jockeys
```

**レスポンス例**:
```json
[
  {
    "jockey": "テスト騎手1",
    "race_count": 5,
    "win_count": 2,
    "place_rate": 0.6,
    "average_rating": 4.5
  },
  {
    "jockey": "テスト騎手2",
    "race_count": 3,
    "win_count": 0,
    "place_rate": 0.33,
    "average_rating": 2.0
  }
]
```

#### 開催場別統計の取得

```
GET /stats/venues
```

**レスポンス例**:
```json
[
  {
    "venue": "東京",
    "race_count": 12,
    "average_rating": 3.8,
    "success_rate": 0.5
  },
  {
    "venue": "京都",
    "race_count": 10,
    "average_rating": 3.2,
    "success_rate": 0.4
  }
]
```

#### レコメンデーションの取得

```
GET /recommendations
```

**レスポンス例**:
```json
{
  "recommended_jockeys": [
    {
      "jockey": "テスト騎手1",
      "average_rating": 4.5,
      "success_rate": 0.75
    }
  ],
  "recommended_venues": [
    {
      "venue": "東京",
      "average_rating": 3.8,
      "success_rate": 0.5
    }
  ]
}
```

### データ同期 API

#### データ同期の実行

```
POST /sync
```

**リクエストボディ**:
```json
{
  "force": false
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "races_added": 5,
    "horses_added": 30,
    "message": "Data synchronized successfully"
  }
}
```

## Swagger UI

FastAPIではSwagger UIが自動的に生成されます。開発環境では以下のURLでAPI仕様書を閲覧・テストできます。

```
http://localhost:8000/docs
```

## ReDoc

FastAPIではReDocも自動的に生成されます。より読みやすいAPI仕様書が好みであれば、以下のURLで閲覧できます。

```
http://localhost:8000/redoc
```

## エラーレスポンス

エラーが発生した場合、適切なHTTPステータスコードとエラーメッセージを含むJSONオブジェクトが返されます。

**エラーレスポンス例**:
```json
{
  "detail": "Resource not found"
}
```

一般的なエラーコード:
- 400: Bad Request - リクエストの形式が不正
- 404: Not Found - リソースが見つからない
- 500: Internal Server Error - サーバーエラー 