import type { Collection } from '@rekognition-manager/contracts';
import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import type { RekognitionRepository } from '../application/rekognition-repository.js';
import { RekognitionService } from '../application/rekognition-service.js';
import { createApp } from './app.js';
import { createOidcHandlers, selectDisplayName, type OidcHandlers } from './oidc.js';

function createRepository(overrides: Partial<RekognitionRepository> = {}): RekognitionRepository {
  const collection: Collection = { collectionId: 'employees', faceModelVersion: '7.0' };
  return {
    listCollections: vi.fn().mockResolvedValue({ items: [collection], nextCursor: null }),
    describeCollection: vi.fn().mockResolvedValue(collection),
    createCollection: vi.fn().mockResolvedValue(collection),
    deleteCollection: vi.fn().mockResolvedValue(undefined),
    listUsers: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findUser: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue({ userId: 'user-001', userStatus: 'CREATED' }),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    listFaces: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    registerFace: vi.fn().mockResolvedValue({ faces: [], unindexedFaceCount: 0 }),
    searchUsersByImage: vi
      .fn()
      .mockResolvedValue({ matches: [], searchedFaceFound: false, unsearchedFaceCount: 0 }),
    deleteFace: vi.fn().mockResolvedValue(undefined),
    getFaceImage: vi.fn().mockResolvedValue(null),
    associateFaces: vi
      .fn()
      .mockResolvedValue({ associatedFaceIds: [], unsuccessful: [], userStatus: 'ACTIVE' }),
    disassociateFace: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function testApp(repository = createRepository(), oidc?: OidcHandlers) {
  return createApp(pino({ level: 'silent' }), () => new RekognitionService(repository), oidc);
}

describe('BFF API', () => {
  it('ヘルスチェックを返す', async () => {
    const response = await testApp().request('/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('OIDCの実行時状態を返す', async () => {
    const disabledResponse = await testApp().request('/auth/status');
    await expect(disabledResponse.json()).resolves.toEqual({
      enabled: false,
      providerName: null,
      sessionCookieName: null,
    });

    const enabledResponse = await testApp(createRepository(), createTestOidc(true)).request(
      '/auth/status',
    );
    await expect(enabledResponse.json()).resolves.toEqual({
      enabled: true,
      providerName: 'Test Provider',
      sessionCookieName: 'rekognition-manager-session',
    });
  });

  it('コレクション一覧を統一形式で返す', async () => {
    const response = await testApp().request('/api/v1/collections?limit=20');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ collectionId: 'employees', faceModelVersion: '7.0' }],
      nextCursor: null,
    });
  });

  it('OIDC有効時はセッションなしのAPIアクセスを拒否する', async () => {
    const response = await testApp(createRepository(), createTestOidc(false)).request(
      '/api/v1/collections',
    );
    expect(response.status).toBe(401);
  });

  it('OIDC有効時は有効なセッションでAPIアクセスを許可する', async () => {
    const response = await testApp(createRepository(), createTestOidc(true)).request(
      '/api/v1/collections',
    );
    expect(response.status).toBe(200);
  });

  it('OIDC有効時もヘルスチェックは認証を要求しない', async () => {
    const response = await testApp(createRepository(), createTestOidc(false)).request('/health');
    expect(response.status).toBe(200);
  });

  it('OIDCのログイン・コールバック・ログアウト経路を公開する', async () => {
    const app = testApp(createRepository(), createTestOidc(true));
    expect((await app.request('/auth/login')).status).toBe(302);
    expect((await app.request('/auth/me')).status).toBe(200);
    expect((await app.request('/auth/callback')).status).toBe(302);
    expect((await app.request('/auth/logout', { method: 'POST' })).status).toBe(303);
  });

  it('ログイン後は安全なアプリ内returnToへ戻す', async () => {
    const app = testApp(createRepository(), createTestOidc(true));
    const allowed = await app.request(
      '/auth/login?returnTo=%2Fcollections%2Femployees%2Fusers%3Flimit%3D20',
    );
    expect(allowed.headers.get('location')).toBe('/collections/employees/users?limit=20');

    const external = await app.request('/auth/login?returnTo=https%3A%2F%2Fmalicious.example%2F');
    expect(external.headers.get('location')).toBe('/collections');
  });

  it('OIDCのアクセス拒否をJSONでは403へ変換する', async () => {
    const app = testApp(createRepository(), createRealOidc());
    const response = await app.request(
      '/auth/callback?error=access_denied&error_description=raw-provider-message&state=expected',
      {
        headers: {
          Accept: 'application/json',
          Cookie: 'state=expected',
        },
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'OIDC_ACCESS_DENIED',
        message: 'このサービスを利用する権限がありません',
      },
    });
  });

  it('OIDCのアクセス拒否をブラウザではサインイン画面へ戻す', async () => {
    const app = testApp(createRepository(), createRealOidc());
    const response = await app.request('/auth/callback?error=access_denied&state=expected', {
      headers: { Accept: 'text/html', Cookie: 'state=expected' },
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/sign-in?error=access_denied',
    );
  });

  it('OIDCエラーでもstate不一致なら400で拒否する', async () => {
    const app = testApp(createRepository(), createRealOidc());
    const response = await app.request('/auth/callback?error=access_denied&state=unexpected', {
      headers: {
        Accept: 'application/json',
        Cookie: 'state=expected',
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_OIDC_CALLBACK' },
    });
  });

  it('不正なコレクションIDをAWSへ送らず400にする', async () => {
    const createCollection = vi.fn();
    const repository = createRepository({ createCollection });
    const response = await testApp(repository).request('/api/v1/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: 'invalid/id' }),
    });
    expect(response.status).toBe(400);
    expect(createCollection).not.toHaveBeenCalled();
    expect((await response.json()) as { error: { code: string } }).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('存在しないユーザーを404にする', async () => {
    const response = await testApp().request('/api/v1/collections/employees/users/missing-user');
    expect(response.status).toBe(404);
    expect((await response.json()) as { error: { code: string } }).toMatchObject({
      error: { code: 'RESOURCE_NOT_FOUND' },
    });
  });

  it('画像からユーザーを検索する', async () => {
    const searchUsersByImage = vi.fn().mockResolvedValue({
      matches: [{ userId: 'user-001', userStatus: 'ACTIVE', similarity: 98.5 }],
      searchedFaceFound: true,
      unsearchedFaceCount: 0,
    });
    const repository = createRepository({ searchUsersByImage });
    const formData = new FormData();
    formData.append(
      'image',
      new File([Uint8Array.from([1, 2, 3])], 'face.png', { type: 'image/png' }),
    );
    formData.append('userMatchThreshold', '90');
    formData.append('maxUsers', '5');

    const response = await testApp(repository).request(
      '/api/v1/collections/employees/search/users-by-image',
      { method: 'POST', body: formData },
    );

    expect(response.status).toBe(200);
    expect(searchUsersByImage).toHaveBeenCalledWith({
      collectionId: 'employees',
      bytes: Uint8Array.from([1, 2, 3]),
      userMatchThreshold: 90,
      maxUsers: 5,
    });
    await expect(response.json()).resolves.toMatchObject({
      matches: [{ userId: 'user-001', similarity: 98.5 }],
    });
  });
});

describe('OIDC表示名', () => {
  it('最初の空でない標準クレームを選ぶ', () => {
    expect(selectDisplayName([undefined, '  ', 'preferred-user', 'mail@example.com'])).toBe(
      'preferred-user',
    );
  });

  it('利用できるクレームがない場合も空にしない', () => {
    expect(selectDisplayName([undefined, null, ''])).toBe('Unknown user');
  });
});

function createTestOidc(authenticated: boolean): OidcHandlers {
  const pass: OidcHandlers['initialize'] = async (_context, next) => {
    await next();
  };
  return {
    providerName: 'Test Provider',
    initialize: pass,
    requireLogin: async (_context, next) => {
      await next();
    },
    requireApiAuth: authenticated
      ? pass
      : (context) =>
          Promise.resolve(
            context.json({ error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } }, 401),
          ),
    currentUser: (context) =>
      Promise.resolve(
        authenticated
          ? context.json({ displayName: 'Test User' })
          : context.json({ error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } }, 401),
      ),
    callback: (context) => Promise.resolve(context.redirect('/collections')),
    logout: (context) => Promise.resolve(context.redirect('/auth/logged-out', 303)),
  };
}

function createRealOidc(): OidcHandlers {
  return createOidcHandlers({
    NODE_ENV: 'test',
    PORT: 3001,
    LOG_LEVEL: 'silent',
    AWS_REGION: 'ap-northeast-1',
    OIDC_ENABLED: true,
    OIDC_ISSUER_URL: 'https://id.example.com',
    OIDC_CLIENT_ID: 'rekognition-manager',
    OIDC_CLIENT_SECRET: 'client-secret',
    OIDC_AUTH_SECRET: 'a-secure-session-secret-with-32-characters',
    OIDC_PROVIDER_NAME: 'Test Provider',
    APP_ORIGIN: 'http://localhost:3000',
  });
}
