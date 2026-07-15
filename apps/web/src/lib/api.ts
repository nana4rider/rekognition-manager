import { errorResponseSchema, type ErrorResponse } from '@rekognition-manager/contracts';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'UNKNOWN_ERROR',
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readError(value: unknown): ErrorResponse | null {
  const result = errorResponseSchema.safeParse(value);
  return result.success ? result.data : null;
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, {
    ...init,
    headers,
  });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = readError(body);
    throw new ApiError(
      error?.error.message ?? 'APIの呼び出しに失敗しました',
      response.status,
      error?.error.code,
      error?.error.requestId,
    );
  }
  return schema.parse(body);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(path, { method: 'DELETE' });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error = readError(body);
    throw new ApiError(
      error?.error.message ?? '削除に失敗しました',
      response.status,
      error?.error.code,
      error?.error.requestId,
    );
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '予期しないエラーが発生しました';
}
