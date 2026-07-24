import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuthStatus } from './lib/auth-status';
import { config, proxy } from './proxy';

vi.mock('./lib/auth-status', () => ({
  getAuthStatus: vi.fn(),
  OIDC_ENABLED_REQUEST_HEADER: 'x-rekognition-manager-oidc-enabled',
}));

const getAuthStatusMock = vi.mocked(getAuthStatus);

beforeEach(() => {
  getAuthStatusMock.mockReset();
});

describe('Web ProxyのOIDC制御', () => {
  it.each(['/health', '/ready'])('%sはOIDC制御の対象外にする', (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: `http://localhost:3000${path}` })).toBe(
      false,
    );
  });

  it.each(['/', '/collections', '/collections/example/users'])(
    '%sはOIDC制御の対象にする',
    (path) => {
      expect(unstable_doesMiddlewareMatch({ config, url: `http://localhost:3000${path}` })).toBe(
        true,
      );
    },
  );

  it.each(['/api/v1/collections', '/auth/sign-in', '/favicon.ico'])(
    '%sはOIDC制御の対象外にする',
    (path) => {
      expect(unstable_doesMiddlewareMatch({ config, url: `http://localhost:3000${path}` })).toBe(
        false,
      );
    },
  );

  it('追加したトップレベル画面は明示的にmatcherへ追加する', () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: 'http://localhost:3000/example',
      }),
    ).toBe(false);
  });

  it('OIDC有効かつセッションなしならログインへリダイレクトする', async () => {
    getAuthStatusMock.mockResolvedValue({
      enabled: true,
      providerName: 'Pocket ID',
      sessionCookieName: 'rekognition-manager-session',
    });

    const response = await proxy(new NextRequest('http://localhost:3000/collections'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/sign-in?returnTo=%2Fcollections',
    );
  });

  it('OIDC有効かつセッションありなら画面を表示する', async () => {
    getAuthStatusMock.mockResolvedValue({
      enabled: true,
      providerName: 'Pocket ID',
      sessionCookieName: 'rekognition-manager-session',
    });
    const request = new NextRequest('http://localhost:3000/collections', {
      headers: { Cookie: 'rekognition-manager-session=signed-session' },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it('OIDC無効ならセッションなしでも画面を表示する', async () => {
    getAuthStatusMock.mockResolvedValue({
      enabled: false,
      providerName: null,
      sessionCookieName: null,
    });

    const response = await proxy(new NextRequest('http://localhost:3000/collections'));

    expect(response.status).toBe(200);
  });
});
