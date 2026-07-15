import type { Collection } from '@rekognition-manager/contracts';
import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import type { RekognitionRepository } from '../application/rekognition-repository.js';
import { RekognitionService } from '../application/rekognition-service.js';
import { createApp } from './app.js';

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
    deleteFace: vi.fn().mockResolvedValue(undefined),
    associateFaces: vi
      .fn()
      .mockResolvedValue({ associatedFaceIds: [], unsuccessful: [], userStatus: 'ACTIVE' }),
    disassociateFace: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function testApp(repository = createRepository()) {
  return createApp(pino({ level: 'silent' }), () => new RekognitionService(repository));
}

describe('BFF API', () => {
  it('ヘルスチェックを返す', async () => {
    const response = await testApp().request('/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('コレクション一覧を統一形式で返す', async () => {
    const response = await testApp().request('/api/v1/collections?limit=20');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ collectionId: 'employees', faceModelVersion: '7.0' }],
      nextCursor: null,
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
});
