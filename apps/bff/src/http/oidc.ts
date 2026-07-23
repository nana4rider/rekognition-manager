import {
  getAuth,
  initOidcAuthMiddleware,
  oidcAuthMiddleware,
  processOAuthCallback,
  revokeSession,
  type OidcClaimsHook,
} from '@hono/oidc-auth';
import type { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie } from 'hono/cookie';

import type { AppConfig } from '../config.js';
import type { AppEnv } from './types.js';

export interface OidcHandlers {
  providerName: string;
  initialize: MiddlewareHandler<AppEnv>;
  requireLogin: MiddlewareHandler<AppEnv>;
  requireApiAuth: MiddlewareHandler<AppEnv>;
  currentUser: MiddlewareHandler<AppEnv>;
  callback: MiddlewareHandler<AppEnv>;
  logout: MiddlewareHandler<AppEnv>;
}

type EnabledOidcConfig = AppConfig & {
  OIDC_ISSUER_URL: string;
  OIDC_CLIENT_ID: string;
  OIDC_CLIENT_SECRET: string;
  OIDC_AUTH_SECRET: string;
  APP_ORIGIN: string;
};

export function createOidcHandlers(config: EnabledOidcConfig): OidcHandlers {
  const initializeOidc = initOidcAuthMiddleware({
    OIDC_AUTH_SECRET: config.OIDC_AUTH_SECRET,
    OIDC_ISSUER: config.OIDC_ISSUER_URL,
    OIDC_CLIENT_ID: config.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: config.OIDC_CLIENT_SECRET,
    OIDC_REDIRECT_URI: `${config.APP_ORIGIN}/auth/callback`,
    OIDC_AUTH_EXTERNAL_URL: config.APP_ORIGIN,
    OIDC_SCOPES: 'openid profile email',
    OIDC_COOKIE_NAME: 'rekognition-manager-session',
    ...(config.OIDC_AUDIENCE ? { OIDC_AUDIENCE: config.OIDC_AUDIENCE } : {}),
  });
  const claimsHook: OidcClaimsHook = (original, claims) =>
    Promise.resolve({
      sub: stringClaim(claims?.sub) ?? original?.sub ?? '',
      email: stringClaim(claims?.email) ?? original?.email ?? '',
      displayName: selectDisplayName([
        claims?.name,
        claims?.preferred_username,
        claims?.email,
        original?.displayName,
        original?.email,
        claims?.sub,
        original?.sub,
      ]),
    });

  return {
    providerName: config.OIDC_PROVIDER_NAME,
    initialize: async (context, next) => {
      context.set('oidcClaimsHook', claimsHook);
      await initializeOidc(context, next);
    },
    requireLogin: oidcAuthMiddleware(),
    requireApiAuth: async (context, next) => {
      try {
        if (await getAuth(context)) {
          await next();
          return;
        }
      } catch (error) {
        context.get('logger').warn({ err: error }, 'OIDC session verification failed');
      }
      return context.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'ログインが必要です',
            requestId: context.get('requestId'),
          },
        },
        401,
      );
    },
    currentUser: async (context) => {
      const auth = await getAuth(context);
      if (!auth) {
        return context.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'ログインが必要です',
              requestId: context.get('requestId'),
            },
          },
          401,
        );
      }
      const displayName = selectDisplayName([auth.displayName, auth.email, auth.sub]);
      return context.json({ displayName });
    },
    callback: async (context) => {
      const oauthError = context.req.query('error');
      if (!oauthError) return processOAuthCallback(context);

      const callbackPath = new URL('/auth/callback', config.APP_ORIGIN).pathname;
      const expectedState = getCookie(context, 'state');
      const receivedState = context.req.query('state');
      clearTemporaryOidcCookies(context, callbackPath);
      if (!expectedState || !receivedState || expectedState !== receivedState) {
        context.get('logger').warn({ oauthError }, 'OIDC callback state verification failed');
        return context.json(
          {
            error: {
              code: 'INVALID_OIDC_CALLBACK',
              message: 'ログイン応答を検証できません',
              requestId: context.get('requestId'),
            },
          },
          400,
        );
      }

      const mappedError = mapOAuthError(oauthError);
      context.get('logger').warn({ oauthError }, 'OIDC provider returned an error');
      if (context.req.header('Accept')?.includes('application/json')) {
        return context.json(
          {
            error: {
              code: mappedError.code,
              message: mappedError.message,
              requestId: context.get('requestId'),
            },
          },
          mappedError.status,
        );
      }
      const signInUrl = new URL('/auth/sign-in', config.APP_ORIGIN);
      signInUrl.searchParams.set('error', mappedError.queryValue);
      return context.redirect(signInUrl.toString(), 303);
    },
    logout: async (context) => {
      await revokeSession(context);
      return context.redirect(`${config.APP_ORIGIN}/auth/logged-out`, 303);
    },
  };
}

export function selectDisplayName(values: unknown[]): string {
  for (const value of values) {
    const claim = stringClaim(value);
    if (claim) return claim;
  }
  return 'Unknown user';
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function clearTemporaryOidcCookies(
  context: Parameters<OidcHandlers['callback']>[0],
  callbackPath: string,
): void {
  for (const name of ['state', 'nonce', 'code_verifier', 'continue']) {
    deleteCookie(context, name, { path: callbackPath });
  }
}

function mapOAuthError(error: string): {
  code: string;
  message: string;
  queryValue: string;
  status: 403 | 502 | 503;
} {
  if (error === 'access_denied') {
    return {
      code: 'OIDC_ACCESS_DENIED',
      message: 'このサービスを利用する権限がありません',
      queryValue: 'access_denied',
      status: 403,
    };
  }
  if (error === 'temporarily_unavailable' || error === 'server_error') {
    return {
      code: 'OIDC_PROVIDER_UNAVAILABLE',
      message: '認証プロバイダーを一時的に利用できません',
      queryValue: 'provider_unavailable',
      status: 503,
    };
  }
  return {
    code: 'OIDC_AUTHENTICATION_FAILED',
    message: 'ログインを完了できませんでした',
    queryValue: 'authentication_failed',
    status: 502,
  };
}
