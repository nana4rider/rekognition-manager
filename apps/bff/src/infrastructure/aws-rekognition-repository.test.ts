import { ListCollectionsCommand, type RekognitionClient } from '@aws-sdk/client-rekognition';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../application/logger.js';
import { AwsRekognitionRepository } from './aws-rekognition-repository.js';

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('AwsRekognitionRepository', () => {
  it('ListCollectionsの結果をアプリケーション形式へ変換する', async () => {
    const send = vi.fn().mockResolvedValue({
      CollectionIds: ['employees'],
      FaceModelVersions: ['7.0'],
      NextToken: 'aws-next-token',
    });
    const repository = new AwsRekognitionRepository(
      { send } as unknown as RekognitionClient,
      logger,
    );

    const result = await repository.listCollections(25);

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListCollectionsCommand);
    expect(result).toEqual({
      items: [{ collectionId: 'employees', faceModelVersion: '7.0' }],
      nextCursor: Buffer.from('aws-next-token').toString('base64url'),
    });
  });

  it('カーソルをAWSのNextTokenへ戻す', async () => {
    const send = vi.fn().mockResolvedValue({ CollectionIds: [] });
    const repository = new AwsRekognitionRepository(
      { send } as unknown as RekognitionClient,
      logger,
    );
    const cursor = Buffer.from('aws-next-token').toString('base64url');

    await repository.listCollections(25, cursor);

    const command = send.mock.calls[0]?.[0] as ListCollectionsCommand;
    expect(command.input.NextToken).toBe('aws-next-token');
  });
});
