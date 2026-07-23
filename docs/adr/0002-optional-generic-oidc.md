# ADR 0002: OIDC認証を任意機能として追加する

- 状態: 採用
- 日付: 2026-07-23

## 背景

初期版は認証を持たないが、運用環境ではOIDCによるアクセス制限を任意に有効化したい。特定のクラウドやIDプロバイダーには依存しないこと、AWS認証情報とOIDCの資格情報をブラウザへ公開しないことが必要である。

## 決定

- `OIDC_ENABLED` の既定値を `false` とし、無効時は従来どおり動作させる。
- Honoの`@hono/oidc-auth`ミドルウェアを使用し、プロバイダー固有SDKを使わない。
- Hono BFFがOIDC Discovery、Authorization Code Flow、PKCE、コールバック、セッション更新、ログアウトを担当する。
- ミドルウェアはリフレッシュトークンとユーザー情報を含むセッションJWTを生成し、`HttpOnly`かつ`Secure`な署名済みCookieへ保存する。Cookieの署名には32文字以上の`OIDC_AUTH_SECRET`を使う。
- Next.jsは`/auth`と`/api`をBFFへ中継する。同一オリジンのCookieはそのままBFFへ転送し、Next.js自身はトークンを解析しない。
- OIDCの有効状態とプロバイダー表示名はBFFを唯一の判定元とする。Next.jsのProxyは実行時に`/auth/status`を取得し、OIDC有効かつセッションCookieがない画面リクエストを`/auth/sign-in`へリダイレクトする。
- サインイン画面で利用者がボタンを押した場合だけ`/auth/login`からOIDCフローを開始する。ログイン後の`returnTo`は同一アプリ内の相対パスだけを許可する。
- APIはOIDCプロバイダーへリダイレクトせず、未認証時に一貫した401 JSONを返す。
- BFFはAPIごとに署名済みセッションを検証し、既定で15分ごとにリフレッシュトークンを使ってログイン状態を更新する。`/health`と`/ready`は監視のため認証対象外とする。
- ログアウトはローカルセッションを削除し、プロバイダーが失効エンドポイントを提供している場合はリフレッシュトークンも失効させる。プロバイダー全体のログアウトは対象外とする。

## 影響

- OIDC有効時は`OIDC_ISSUER_URL`、`OIDC_CLIENT_ID`、`OIDC_CLIENT_SECRET`、`OIDC_AUTH_SECRET`、`APP_ORIGIN`が必須になる。
- `@hono/oidc-auth`はリフレッシュトークンを必要とするため、パブリッククライアントではなく機密クライアントを使用する。プロバイダーが要求する場合は`OIDC_SCOPES`へ`offline_access`を追加する。
- プロバイダーには `${APP_ORIGIN}/auth/callback` をリダイレクトURIとして登録する。
- セッションはサーバー側ストレージを持たない。署名済みCookieが通常のCookie上限を超えるプロバイダーでは利用できないため、その場合は別のセッション方式を検討する。
- BFFはCookieを検証するが、通常はWebからだけ到達できるネットワーク構成を推奨する。
- WebはOIDC環境変数を必要としないため、同じDockerイメージをOIDC有効・無効の両環境で使用できる。BFFの認証状態を取得できない場合、Webは認証を迂回せず503を返す。
