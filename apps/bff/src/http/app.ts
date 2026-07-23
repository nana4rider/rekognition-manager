import { ApplicationError } from '../application/errors.js';
import type { Logger } from '../application/logger.js';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import type { Logger as PinoLogger } from 'pino';
import { ZodError } from 'zod';

import type { AppEnv } from './types.js';
import { createApiRoutes, type ServiceFactory } from './routes.js';
import type { OidcHandlers } from './oidc.js';

export function createApp(
  rootLogger: PinoLogger,
  createService: ServiceFactory,
  oidc?: OidcHandlers,
): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', requestId());
  app.use('*', async (context, next) => {
    const logger = rootLogger.child({ requestId: context.get('requestId') });
    context.set('logger', logger);
    const startedAt = performance.now();
    logger.info({ method: context.req.method, path: context.req.path }, 'request started');
    await next();
    logger.info(
      {
        method: context.req.method,
        path: context.req.path,
        status: context.res.status,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'request completed',
    );
  });
  if (oidc) app.use('*', oidc.initialize);

  app.get('/health', (context) => context.json({ status: 'ok' }));
  app.get('/ready', (context) => context.json({ status: 'ready' }));
  app.get('/auth/status', (context) =>
    context.json({
      enabled: oidc !== undefined,
      providerName: oidc?.providerName ?? null,
      sessionCookieName: oidc ? 'rekognition-manager-session' : null,
    }),
  );
  if (oidc) {
    app.get('/auth/login', oidc.requireLogin, (context) =>
      context.redirect(safeReturnTo(context.req.query('returnTo'))),
    );
    app.get('/auth/callback', oidc.callback);
    app.post('/auth/logout', oidc.logout);
    app.use('/api/*', oidc.requireApiAuth);
  }
  app.route('/api/v1', createApiRoutes(createService));

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: '指定したAPIが見つかりません',
          requestId: context.get('requestId'),
        },
      },
      404,
    ),
  );

  app.onError((error, context) => {
    const logger = context.get('logger');
    const requestId = context.get('requestId');

    if (error instanceof ZodError) {
      logger.warn({ issueCount: error.issues.length }, 'validation failed');
      return context.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容を確認してください',
            requestId,
            details: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        400,
      );
    }

    if (error instanceof ApplicationError) {
      const log: Logger = logger;
      log.warn({ code: error.code, status: error.status }, error.message);
      return context.json(
        { error: { code: error.code, message: error.message, requestId } },
        error.status as 400,
      );
    }

    logger.error({ err: error }, 'unhandled error');
    return context.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '予期しないエラーが発生しました',
          requestId,
        },
      },
      500,
    );
  });

  return app;
}

function safeReturnTo(candidate: string | undefined): string {
  if (!candidate?.startsWith('/') || candidate.startsWith('//')) return '/collections';
  const url = new URL(candidate, 'http://app.internal');
  if (url.origin !== 'http://app.internal') return '/collections';
  return `${url.pathname}${url.search}${url.hash}`;
}
