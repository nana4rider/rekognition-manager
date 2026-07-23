import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuthStatus } from './lib/auth-status';
import { proxy } from './proxy';

vi.mock('./lib/auth-status', () => ({
  getAuthStatus: vi.fn(),
  OIDC_ENABLED_REQUEST_HEADER: 'x-rekognition-manager-oidc-enabled',
}));

const getAuthStatusMock = vi.mocked(getAuthStatus);

beforeEach(() => {
  getAuthStatusMock.mockReset();
});

describe('Web ProxyのOIDC制御', () => {
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
