import {
  getAuth,
  initOidcAuthMiddleware,
  oidcAuthMiddleware,
  processOAuthCallback,
  revokeSession,
} from '@hono/oidc-auth';
import type { MiddlewareHandler } from 'hono';

import type { AppConfig } from '../config.js';
import type { AppEnv } from './types.js';

export interface OidcHandlers {
  providerName: string;
  initialize: MiddlewareHandler<AppEnv>;
  requireLogin: MiddlewareHandler<AppEnv>;
  requireApiAuth: MiddlewareHandler<AppEnv>;
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
  return {
    providerName: config.OIDC_PROVIDER_NAME,
    initialize: initOidcAuthMiddleware({
      OIDC_AUTH_SECRET: config.OIDC_AUTH_SECRET,
      OIDC_ISSUER: config.OIDC_ISSUER_URL,
      OIDC_CLIENT_ID: config.OIDC_CLIENT_ID,
      OIDC_CLIENT_SECRET: config.OIDC_CLIENT_SECRET,
      OIDC_REDIRECT_URI: `${config.APP_ORIGIN}/auth/callback`,
      OIDC_AUTH_EXTERNAL_URL: config.APP_ORIGIN,
      OIDC_SCOPES: config.OIDC_SCOPES,
      OIDC_COOKIE_NAME: 'rekognition-manager-session',
      ...(config.OIDC_AUDIENCE ? { OIDC_AUDIENCE: config.OIDC_AUDIENCE } : {}),
    }),
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
    callback: (context) => processOAuthCallback(context),
    logout: async (context) => {
      await revokeSession(context);
      return context.redirect(`${config.APP_ORIGIN}/auth/logged-out`, 303);
    },
  };
}
