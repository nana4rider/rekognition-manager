# Rekognition Manager

[![License: ISC](https://img.shields.io/github/license/nana4rider/rekognition-manager)](LICENSE)
![GitHub Actions Test](https://github.com/nana4rider/rekognition-manager/actions/workflows/test.yml/badge.svg)
![GitHub Actions Release](https://github.com/nana4rider/rekognition-manager/actions/workflows/release.yml/badge.svg)

Amazon Rekognition のコレクション、ユーザー、顔を管理する Web UI です。

## 特長

- コレクションの一覧、作成、削除
- ユーザーの一覧、作成、削除
- 顔の登録、一覧、削除
- ユーザーと顔の関連付け・解除
- 画像からのユーザー検索
- OIDC 認証を任意で有効化可能

## 構成

- `apps/web`: Next.js フロントエンド
- `apps/bff`: Hono ベースの BFF API
- `packages/contracts`: 共有 API スキーマ

ブラウザからの Rekognition 操作は BFF を通じて行われます。

## 必要な環境

- Node.js 24 以上
- npm 11 以上
- Amazon Rekognition を利用できる AWS アカウント
- (任意) Docker

## はじめ方

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数ファイルをコピー

```bash
cp .env.example .env
```

3. `.env` を編集して AWS 設定などを反映

AWS 認証情報は、`AWS_PROFILE` や IAM ロールを使う場合、`.env` に直接書く必要はありません。

## IAM 設定

このアプリを使うには、AWS 上で Rekognition と必要な S3 操作を行える IAM 権限が必要です。

- Rekognition のコレクション、ユーザー、顔の操作
- 顔画像のアップロード/取得/削除のための S3 アクセス

AWS CLI や SDK で動かす場合は、適切な IAM ユーザーまたはロールを準備してください。

下記は IAM ポリシーの例です。ユーザー名、バケット名、リージョン、アカウント ID は実際の値へ置き換えてください。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FaceImageAndRekognitionAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "rekognition:CreateCollection",
        "rekognition:DeleteCollection",
        "rekognition:DescribeCollection",
        "rekognition:ListCollections",
        "rekognition:CreateUser",
        "rekognition:DeleteUser",
        "rekognition:ListUsers",
        "rekognition:IndexFaces",
        "rekognition:DeleteFaces",
        "rekognition:ListFaces",
        "rekognition:AssociateFaces",
        "rekognition:DisassociateFaces",
        "rekognition:SearchUsersByImage"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:rekognition:ap-northeast-1:123456789012:collection/*"
      ]
    }
  ]
}
```

## ローカル実行

```bash
npm run dev
```

- Web: http://localhost:3000
- BFF: http://localhost:3001
- ヘルスチェック: http://localhost:3001/health

## OIDC 認証 (任意)

OIDC を有効化する場合は、`.env` で `OIDC_ENABLED=true` を設定します。
詳細な設定例は `.env.example` を参照してください。

OIDC を無効のままでも、Web UI の基本機能はそのまま利用できます。

## 品質チェック

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker

先に `.env` を準備してから起動します。

```bash
docker compose up --build
```

停止:

```bash
docker compose down
```

Web と BFF は別々のコンテナとして動作します。

## ドキュメント

- [API Document](https://nana4rider.github.io/openapi-ui/?rekognition-manager)

## 補足

設計の記録は [docs/adr](docs/adr) にあります。
