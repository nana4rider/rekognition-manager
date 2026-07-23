# Rekognition Manager

[![License: ISC](https://img.shields.io/github/license/nana4rider/rekognition-manager)](LICENSE)
![GitHub Actions Test](https://github.com/nana4rider/rekognition-manager/actions/workflows/test.yml/badge.svg)
![GitHub Actions Release](https://github.com/nana4rider/rekognition-manager/actions/workflows/release.yml/badge.svg)

Amazon Rekognitionのコレクション、ユーザー、顔を管理するWeb UIです。

## 現在の機能

- コレクションの一覧、作成、詳細、削除
- ユーザーの一覧、作成、詳細、削除
- 顔の一覧、画像からの登録、削除
- ユーザーと顔の関連付け、関連付け解除
- 画像からのユーザー検索
- 環境変数で任意に有効化できる汎用OIDC認証

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
- Docker DesktopまたはDocker Engine(Dockerで起動する場合)

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

### OIDC認証（任意）

認証はデフォルトで無効です。OIDC Discoveryに対応したプロバイダーで有効化する場合は、プロバイダー側へ `http://localhost:3000/auth/callback` をリダイレクトURIとして登録し、`.env`を設定します。

```dotenv
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://id.example.com
OIDC_CLIENT_ID=rekognition-manager
OIDC_CLIENT_SECRET=your-client-secret
OIDC_AUTH_SECRET=32文字以上の十分に長いランダムな値
OIDC_PROVIDER_NAME=Pocket ID
# プロバイダーが要求する場合だけ指定
# OIDC_AUDIENCE=your-api-audience
# プロバイダー側のSSOセッションも終了する場合だけ指定
# OIDC_END_SESSION_URL=https://id.example.com/end-session
APP_ORIGIN=http://localhost:3000
```

`OIDC_AUTH_SECRET`はアプリのセッションCookieへ署名する鍵です。次のコマンドなどで生成し、環境ごとに異なる値を安全に保管してください。

```bash
openssl rand -base64 32
```

認証には`@hono/oidc-auth`を使用します。スコープは、このアプリがログインユーザー名を表示するために必要な`openid profile email`へ固定しています。表示名は`name`、`preferred_username`、`email`、`sub`の順で利用可能な値を選びます。

このミドルウェアはリフレッシュトークンによるセッション更新を行うため、OIDCプロバイダーでは機密クライアントを作成し、`OIDC_CLIENT_SECRET`を必ず設定してください。また、上記スコープでリフレッシュトークンの発行を許可してください。

本番環境の`APP_ORIGIN`にはHTTPSの公開URLを設定してください。OIDCトークン、クライアントシークレット、セッション署名鍵はブラウザのJavaScriptへ公開されず、ログにも出力しません。機密値へ`NEXT_PUBLIC_`を付けないでください。

ログイン状態は既定で15分ごとにリフレッシュトークンを使って確認・更新され、セッション自体は既定で1日後に再認証されます。ログアウト時はローカルセッションを削除し、プロバイダーが失効エンドポイントを提供していればリフレッシュトークンも失効させます。

`OIDC_END_SESSION_URL`を設定すると、その後ブラウザをプロバイダーのend-session endpointへ移動してSSOセッションも終了します。BFFは`client_id`と`post_logout_redirect_uri=${APP_ORIGIN}/auth/sign-in`を付けるため、プロバイダー側にもこのサインインURLをLogout Callback URLとして登録してください。未設定の場合はプロバイダーのSSOセッションを維持したまま、アプリのサインイン画面へ戻ります。

ログイン中はAppBarへユーザー名を表示します。Webは`GET /auth/me`から表示用の名前だけを取得し、OIDCトークンや全クレームをブラウザのJavaScriptへ渡しません。

OIDCの有効・無効はBFFだけが環境変数から判断し、Webは実行時にBFFの`/auth/status`へ問い合わせます。そのため、OIDC有効版と無効版でDockerイメージを分ける必要はありません。`OIDC_PROVIDER_NAME`はサインインボタンの表示名です。

OIDC有効時に未ログインで画面へアクセスすると、簡素なサインイン画面へ移動します。利用者が`Sign in with Pocket ID`のようなボタンを押した場合だけOIDCフローを開始し、完了後は最初に開こうとしたアプリ内画面へ戻ります。APIアクセスはリダイレクトせず、未認証を401のJSONで返します。

OIDCプロバイダーが`access_denied`を返した場合、ブラウザはサインイン画面へ戻り、サービスを利用する権限がないことを表示します。JSONとしてコールバックした場合は403を返します。プロバイダーの生のエラー説明は画面やログへ表示しません。

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

このポリシーでは、顔画像用の S3 バケットへオブジェクトの保存・取得・削除と、Rekognition のコレクション・ユーザー・顔操作を許可します。動作確認用のローカル開発では、実運用前提よりも権限を絞った IAM ユーザーを使うことを推奨します。

## ローカル起動

Web、BFF、共有契約のwatchビルドをまとめて起動します。

```bash
npm run dev
```

- Web: http://localhost:3000
- BFF: http://localhost:3001
- ヘルスチェック: http://localhost:3001/health

OIDC認証を有効にすると、Web画面は未ログイン時にOIDCプロバイダーへ移動します。BFFの`/api/v1/*`も認証必須になり、`/health`と`/ready`だけは認証なしで利用できます。

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

API仕様は[OpenAPI UI](https://nana4rider.github.io/openapi-ui/?rekognition-manager)で確認できます。仕様の元ファイルは[docs/openapi.json](docs/openapi.json)です。

BFFのルートやスキーマを変更した場合は、次のコマンドでOpenAPI仕様を更新します。

```bash
npm run openapi:generate
```

`npm run openapi:check`とGitHub Actionsで、生成済みJSONがBFFの実装と一致していることを検査します。

## その他

設計上の判断は[docs/adr](docs/adr)に記録します。
