import type { Hook } from '@hono/standard-validator';
import type { Context } from 'hono';
import type { AppEnv } from './types.js';

export const validationHook: Hook<unknown, AppEnv, string> = (result, context: Context<AppEnv>) => {
  if (result.success) return;
  return context.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容を確認してください',
        requestId: context.get('logger').bindings().requestId as string | undefined,
        details: result.error.map((issue) => ({
          path: issue.path
            ?.map((segment) =>
              typeof segment === 'object' && segment !== null && 'key' in segment
                ? String(segment.key)
                : String(segment),
            )
            .join('.'),
          message: issue.message,
        })),
      },
    },
    400,
  );
};
