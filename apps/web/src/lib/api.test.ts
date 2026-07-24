import { collectionListResponseSchema } from '@rekognition-manager/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiDelete, apiRequest } from './api';
import { redirectToSignIn } from './auth-navigation';

vi.mock('./auth-navigation', () => ({
  redirectToSignIn: vi.fn(),
}));

const redirectToSignInMock = vi.mocked(redirectToSignIn);

beforeEach(() => {
  vi.restoreAllMocks();
  redirectToSignInMock.mockReset();
});

describe('APIの認証切れ処理', () => {
  it('取得時の401でログイン画面へ遷移する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
    );

    await expect(apiRequest('/api/v1/collections', collectionListResponseSchema)).rejects.toThrow(
      'ログインが必要です',
    );
    expect(redirectToSignInMock).toHaveBeenCalledOnce();
  });

  it('削除時の401でもログイン画面へ遷移する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(apiDelete('/api/v1/collections/example')).rejects.toThrow('削除に失敗しました');
    expect(redirectToSignInMock).toHaveBeenCalledOnce();
  });
});
