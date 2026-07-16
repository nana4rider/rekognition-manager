import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  DeleteFacesCommand,
  IndexFacesCommand,
  ListCollectionsCommand,
  SearchUsersByImageCommand,
  type RekognitionClient,
} from '@aws-sdk/client-rekognition';
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

  it('顔登録後にS3へ画像をアップロードする', async () => {
    const send = vi.fn().mockImplementation((command: unknown) => {
      if (command instanceof IndexFacesCommand) {
        return Promise.resolve({
          FaceRecords: [{ Face: { FaceId: 'face-123', Confidence: 99.5 } }],
        });
      }
      if (command instanceof PutObjectCommand) {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });
    const repository = new AwsRekognitionRepository(
      { send } as unknown as RekognitionClient,
      logger,
      { send } as unknown as never,
      'face-images',
    );

    await repository.registerFace({
      collectionId: 'employees',
      bytes: Uint8Array.from([1, 2, 3]),
      externalImageId: 'ext-1',
      contentType: 'image/png',
    });

    const putObjectCall = send.mock.calls.find((call) => call[0] instanceof PutObjectCommand);
    expect(putObjectCall).toBeDefined();
    const putCommand = putObjectCall?.[0] as PutObjectCommand;
    expect(putCommand.input.Bucket).toBe('face-images');
    expect(putCommand.input.Key).toBe('employees/face-123');
    expect(putCommand.input.ContentType).toBe('image/png');
  });

  it('顔削除時にS3のオブジェクトも削除する', async () => {
    const send = vi.fn().mockImplementation((command: unknown) => {
      if (command instanceof DeleteFacesCommand) {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });
    const repository = new AwsRekognitionRepository(
      { send } as unknown as RekognitionClient,
      logger,
      { send } as unknown as never,
      'face-images',
    );

    await repository.deleteFace('employees', 'face-123');

    expect(send).toHaveBeenCalled();
  });

  it('画像検索結果をアプリケーション形式へ変換する', async () => {
    const send = vi.fn().mockResolvedValue({
      UserMatches: [{ User: { UserId: 'user-001', UserStatus: 'ACTIVE' }, Similarity: 98.5 }],
      SearchedFace: { FaceDetails: {} },
      UnsearchedFaces: [{}],
    });
    const repository = new AwsRekognitionRepository(
      { send } as unknown as RekognitionClient,
      logger,
    );

    const result = await repository.searchUsersByImage({
      collectionId: 'employees',
      bytes: Uint8Array.from([1, 2, 3]),
      userMatchThreshold: 90,
      maxUsers: 5,
    });

    const command = send.mock.calls[0]?.[0] as SearchUsersByImageCommand;
    expect(command).toBeInstanceOf(SearchUsersByImageCommand);
    expect(command.input).toMatchObject({
      CollectionId: 'employees',
      UserMatchThreshold: 90,
      MaxUsers: 5,
      QualityFilter: 'AUTO',
    });
    expect(result).toEqual({
      matches: [{ userId: 'user-001', userStatus: 'ACTIVE', similarity: 98.5 }],
      searchedFaceFound: true,
      unsearchedFaceCount: 1,
    });
  });
});
