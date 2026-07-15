import type { Context } from 'hono';
import type { AppEnv } from './types.js';

export function validationHook(
  result:
    | { success: true; data: unknown }
    | {
        success: false;
        error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
        data?: unknown;
      },
  context: Context<AppEnv>,
) {
  if (result.success) return;
  return context.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容を確認してください',
        requestId: context.get('logger').bindings().requestId as string | undefined,
        details: result.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      },
    },
    400,
  );
}
