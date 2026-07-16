# Rekognition Manager

Amazon Rekognitionのコレクション、ユーザー、顔を管理するWeb UIです。

## 現在の機能

- コレクションの一覧、作成、詳細、削除
- ユーザーの一覧、作成、詳細、削除
- 顔の一覧、画像からの登録、削除
- ユーザーと顔の紐づけ、紐づけ解除
- 入力値の検証と統一されたAPIエラー
- Request ID付きの構造化ログ

初期バージョンではOIDC認証、S3への元画像保存、DB、`SearchUsersByImage`は実装していません。

## 構成

```text
apps/
  web/       Next.js + MUI
  bff/       Hono + AWS SDK v3 + Pino
packages/
  contracts/ ZodによるAPI契約
```

ブラウザはNext.jsの`/api`へアクセスし、Next.jsがHono BFFへ転送します。AWS SDKと認証情報はBFFだけが使用します。

## 必要な環境

- Node.js 24以上
- npm 11以上
- Amazon Rekognitionを利用できるAWSアカウント
- Docker DesktopまたはDocker Engine（Dockerで起動する場合）

## セットアップ

依存関係をインストールします。

```bash
npm install
```

環境変数の見本をコピーし、自分の環境に合わせて編集します。

```bash
cp .env.example .env
```

AWS CLIのプロファイルやIAMロールを利用できる場合、アクセスキーを`.env`へ書く必要はありません。アクセスキーを使う場合だけ、次を設定します。

```dotenv
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

`.env`はGitの管理対象外です。認証情報をコミットしないでください。

### IAMの最小権限例

顔登録・一覧・削除と S3 画像保存/参照を行うための IAM ポリシー例です。ユーザー名、バケット名、リージョン、アカウント ID は実際の値へ置き換えてください。

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
        "rekognition:DisassociateFaces"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:rekognition:ap-northeast-1:123456789012:collection/*"
      ]
    }
  ]
}
```

このポリシーでは、顔画像用の S3 バケットへオブジェクトの保存・取得・削除と、Rekognition のコレクション・ユーザー・顔操作を許可します。動作確認用のローカル開発では、実運用前提よりも権限を絞った IAM ユーザーを使うことを推奨します。

## ローカル起動

Web、BFF、共有契約のwatchビルドをまとめて起動します。

```bash
npm run dev
```

- Web: http://localhost:3000
- BFF: http://localhost:3001
- ヘルスチェック: http://localhost:3001/health

画面を開いただけで一覧APIが実AWSへアクセスします。開発専用のAWSアカウントと最小権限のIAMを使用してください。削除操作は実際のAWSリソースを削除します。

## VS Codeでのデバッグ

「実行とデバッグ」から次を選べます。

- `Web + BFFをデバッグ`
- `Webをデバッグ`
- `BFFをデバッグ`

ブレークポイントを置いてから起動してください。

## 品質チェック

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

通常のテストではAWS SDKをモックし、実際のAWSリソースを変更しません。

## Docker

先に`.env`を作成してから起動します。

```bash
docker compose up --build
```

停止する場合は次を実行します。

```bash
docker compose down
```

WebとBFFは別コンテナです。DockerイメージへAWS認証情報は埋め込みません。

## API

主要なAPIは次のとおりです。

```text
GET    /api/v1/collections
POST   /api/v1/collections
GET    /api/v1/collections/:collectionId
DELETE /api/v1/collections/:collectionId

GET    /api/v1/collections/:collectionId/users
POST   /api/v1/collections/:collectionId/users
GET    /api/v1/collections/:collectionId/users/:userId
DELETE /api/v1/collections/:collectionId/users/:userId

GET    /api/v1/collections/:collectionId/faces
POST   /api/v1/collections/:collectionId/faces
DELETE /api/v1/collections/:collectionId/faces/:faceId

POST   /api/v1/collections/:collectionId/users/:userId/faces
DELETE /api/v1/collections/:collectionId/users/:userId/faces/:faceId
```

顔登録は`multipart/form-data`で`image`と任意の`externalImageId`を送信します。対応形式はJPEGとPNG、上限は5MBです。元画像は保存しません。

## ログ

- 開発環境: `pino-pretty`による読みやすい表示
- 本番環境: JSONを標準出力
- Request ID、HTTPステータス、処理時間、AWS操作名を記録
- AWS認証情報、Cookie、OIDCトークン、顔画像は記録しない

設計上の判断は[docs/adr](docs/adr)に記録します。
