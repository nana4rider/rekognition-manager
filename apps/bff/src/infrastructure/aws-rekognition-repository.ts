import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import {
  AssociateFacesCommand,
  CreateCollectionCommand,
  CreateUserCommand,
  DeleteCollectionCommand,
  DeleteFacesCommand,
  DeleteUserCommand,
  DescribeCollectionCommand,
  DisassociateFacesCommand,
  IndexFacesCommand,
  ListCollectionsCommand,
  ListFacesCommand,
  ListUsersCommand,
  SearchUsersByImageCommand,
  type RekognitionClient,
} from '@aws-sdk/client-rekognition';
import type {
  AssociateFacesResponse,
  Collection,
  Face,
  RegisterFaceResponse,
  SearchUsersByImageResponse,
  User,
} from '@rekognition-manager/contracts';

import type { Logger } from '../application/logger.js';
import type {
  Page,
  RegisterFaceInput,
  RekognitionRepository,
  SearchUsersByImageInput,
} from '../application/rekognition-repository.js';
import { mapAwsError } from './aws-error.js';
import { decodeCursor, encodeCursor } from './cursor.js';

export class AwsRekognitionRepository implements RekognitionRepository {
  constructor(
    private readonly client: RekognitionClient,
    private readonly logger: Logger,
    private readonly s3Client?: S3Client,
    private readonly imageBucketName?: string,
  ) {}

  private getImageObjectKey(collectionId: string, faceId: string): string {
    return `${collectionId}/${faceId}`;
  }

  private async execute<T>(operation: string, action: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();
    try {
      const result = await action();
      this.logger.info(
        { operation, success: true, durationMs: Math.round(performance.now() - startedAt) },
        'Rekognition operation completed',
      );
      return result;
    } catch (error) {
      this.logger.error(
        {
          operation,
          success: false,
          durationMs: Math.round(performance.now() - startedAt),
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Rekognition operation failed',
      );
      throw mapAwsError(error);
    }
  }

  async listCollections(limit: number, cursor?: string): Promise<Page<Collection>> {
    const response = await this.execute('ListCollections', () =>
      this.client.send(
        new ListCollectionsCommand({ MaxResults: limit, NextToken: decodeCursor(cursor) }),
      ),
    );
    const ids = response.CollectionIds ?? [];
    return {
      items: ids.map((collectionId, index) => {
        const collection: Collection = { collectionId };
        const modelVersion = response.FaceModelVersions?.[index];
        if (modelVersion) collection.faceModelVersion = modelVersion;
        return collection;
      }),
      nextCursor: encodeCursor(response.NextToken),
    };
  }

  async describeCollection(collectionId: string): Promise<Collection> {
    const response = await this.execute('DescribeCollection', () =>
      this.client.send(new DescribeCollectionCommand({ CollectionId: collectionId })),
    );
    const collection: Collection = { collectionId };
    if (response.CollectionARN) collection.collectionArn = response.CollectionARN;
    if (response.FaceModelVersion) collection.faceModelVersion = response.FaceModelVersion;
    if (response.CreationTimestamp)
      collection.creationTimestamp = response.CreationTimestamp.toISOString();
    if (response.FaceCount !== undefined) collection.faceCount = response.FaceCount;
    if (response.UserCount !== undefined) collection.userCount = response.UserCount;
    return collection;
  }

  async createCollection(collectionId: string): Promise<Collection> {
    await this.execute('CreateCollection', () =>
      this.client.send(new CreateCollectionCommand({ CollectionId: collectionId })),
    );
    return this.describeCollection(collectionId);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.execute('DeleteCollection', () =>
      this.client.send(new DeleteCollectionCommand({ CollectionId: collectionId })),
    );
  }

  async listUsers(collectionId: string, limit: number, cursor?: string): Promise<Page<User>> {
    const response = await this.execute('ListUsers', () =>
      this.client.send(
        new ListUsersCommand({
          CollectionId: collectionId,
          MaxResults: limit,
          NextToken: decodeCursor(cursor),
        }),
      ),
    );
    return {
      items: (response.Users ?? []).flatMap((item) => {
        if (!item.UserId) return [];
        const user: User = { userId: item.UserId };
        if (item.UserStatus) user.userStatus = item.UserStatus;
        return [user];
      }),
      nextCursor: encodeCursor(response.NextToken),
    };
  }

  async findUser(collectionId: string, userId: string): Promise<User | null> {
    let cursor: string | undefined;
    do {
      const page = await this.listUsers(collectionId, 100, cursor);
      const user = page.items.find((item) => item.userId === userId);
      if (user) return user;
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return null;
  }

  async createUser(collectionId: string, userId: string): Promise<User> {
    await this.execute('CreateUser', () =>
      this.client.send(new CreateUserCommand({ CollectionId: collectionId, UserId: userId })),
    );
    return { userId, userStatus: 'CREATED' };
  }

  async deleteUser(collectionId: string, userId: string): Promise<void> {
    await this.execute('DeleteUser', () =>
      this.client.send(new DeleteUserCommand({ CollectionId: collectionId, UserId: userId })),
    );
  }

  async listFaces(
    collectionId: string,
    limit: number,
    cursor?: string,
    userId?: string,
  ): Promise<Page<Face>> {
    const response = await this.execute('ListFaces', () =>
      this.client.send(
        new ListFacesCommand({
          CollectionId: collectionId,
          MaxResults: limit,
          NextToken: decodeCursor(cursor),
          UserId: userId,
        }),
      ),
    );
    return {
      items: (response.Faces ?? []).flatMap((item) => {
        if (!item.FaceId) return [];
        const face: Face = { faceId: item.FaceId };
        if (item.ImageId) face.imageId = item.ImageId;
        if (item.ExternalImageId) face.externalImageId = item.ExternalImageId;
        if (item.Confidence !== undefined) face.confidence = item.Confidence;
        if (item.UserId) face.userId = item.UserId;
        return [face];
      }),
      nextCursor: encodeCursor(response.NextToken),
    };
  }

  async registerFace(input: RegisterFaceInput): Promise<RegisterFaceResponse> {
    const response = await this.execute('IndexFaces', () =>
      this.client.send(
        new IndexFacesCommand({
          CollectionId: input.collectionId,
          Image: { Bytes: input.bytes },
          ExternalImageId: input.externalImageId,
          MaxFaces: 1,
          QualityFilter: 'AUTO',
        }),
      ),
    );
    const faces = (response.FaceRecords ?? []).flatMap((record) => {
      const item = record.Face;
      if (!item?.FaceId) return [];
      const face: Face = { faceId: item.FaceId };
      if (item.ImageId) face.imageId = item.ImageId;
      if (item.ExternalImageId) face.externalImageId = item.ExternalImageId;
      if (item.Confidence !== undefined) face.confidence = item.Confidence;
      return [face];
    });
    if (this.s3Client && this.imageBucketName && input.contentType) {
      const createdFace = faces[0];
      if (createdFace) {
        const bucketName = this.imageBucketName;
        if (!bucketName) return { faces, unindexedFaceCount: response.UnindexedFaces?.length ?? 0 };
        await this.execute('PutObject', async () => {
          await this.s3Client!.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: this.getImageObjectKey(input.collectionId, createdFace.faceId),
              Body: input.bytes,
              ContentType: input.contentType,
              CacheControl: 'private, no-store',
            }),
          );
        });
      }
    }
    return {
      faces,
      unindexedFaceCount: response.UnindexedFaces?.length ?? 0,
    };
  }

  async searchUsersByImage(input: SearchUsersByImageInput): Promise<SearchUsersByImageResponse> {
    const response = await this.execute('SearchUsersByImage', () =>
      this.client.send(
        new SearchUsersByImageCommand({
          CollectionId: input.collectionId,
          Image: { Bytes: input.bytes },
          UserMatchThreshold: input.userMatchThreshold,
          MaxUsers: input.maxUsers,
          QualityFilter: 'AUTO',
        }),
      ),
    );
    const result: SearchUsersByImageResponse = {
      matches: (response.UserMatches ?? []).flatMap((match) => {
        if (!match.User?.UserId || match.Similarity === undefined) return [];
        const item: SearchUsersByImageResponse['matches'][number] = {
          userId: match.User.UserId,
          similarity: match.Similarity,
        };
        if (match.User.UserStatus) item.userStatus = match.User.UserStatus;
        return [item];
      }),
      searchedFaceFound: response.SearchedFace !== undefined,
      unsearchedFaceCount: response.UnsearchedFaces?.length ?? 0,
    };
    return result;
  }

  async deleteFace(collectionId: string, faceId: string): Promise<void> {
    await this.execute('DeleteFaces', () =>
      this.client.send(new DeleteFacesCommand({ CollectionId: collectionId, FaceIds: [faceId] })),
    );
    if (!this.s3Client || !this.imageBucketName) return;
    const bucketName = this.imageBucketName;
    if (!bucketName) return;
    try {
      await this.execute('DeleteObject', async () => {
        await this.s3Client!.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: this.getImageObjectKey(collectionId, faceId),
          }),
        );
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'NoSuchKey' || error.name === 'NotFound')) {
        return;
      }
      throw error;
    }
  }

  async getFaceImage(
    collectionId: string,
    faceId: string,
  ): Promise<{
    contentType: string;
    body: Uint8Array;
  } | null> {
    if (!this.s3Client || !this.imageBucketName) return null;
    const bucketName = this.imageBucketName;
    if (!bucketName) return null;
    try {
      const response = await this.execute('GetObject', async () => {
        return (await this.s3Client!.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: this.getImageObjectKey(collectionId, faceId),
          }),
        )) as {
          Body?: AsyncIterable<Uint8Array>;
          ContentType?: string;
        };
      });
      const chunks: Uint8Array[] = [];
      if (response.Body) {
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
      }
      return {
        contentType: response.ContentType ?? 'application/octet-stream',
        body: Buffer.concat(chunks),
      };
    } catch (error) {
      if (error instanceof Error && (error.name === 'NoSuchKey' || error.name === 'NotFound')) {
        return null;
      }
      throw error;
    }
  }

  async associateFaces(
    collectionId: string,
    userId: string,
    faceIds: string[],
    userMatchThreshold?: number,
  ): Promise<AssociateFacesResponse> {
    const response = await this.execute('AssociateFaces', () =>
      this.client.send(
        new AssociateFacesCommand({
          CollectionId: collectionId,
          UserId: userId,
          FaceIds: faceIds,
          UserMatchThreshold: userMatchThreshold,
        }),
      ),
    );
    const result: AssociateFacesResponse = {
      associatedFaceIds: (response.AssociatedFaces ?? []).flatMap((face) =>
        face.FaceId ? [face.FaceId] : [],
      ),
      unsuccessful: (response.UnsuccessfulFaceAssociations ?? []).map((item) => {
        const failure: AssociateFacesResponse['unsuccessful'][number] = {
          reasons: item.Reasons ?? [],
        };
        if (item.FaceId) failure.faceId = item.FaceId;
        if (item.UserId) failure.userId = item.UserId;
        if (item.Confidence !== undefined) failure.confidence = item.Confidence;
        return failure;
      }),
    };
    if (response.UserStatus) result.userStatus = response.UserStatus;
    return result;
  }

  async disassociateFace(collectionId: string, userId: string, faceId: string): Promise<void> {
    await this.execute('DisassociateFaces', () =>
      this.client.send(
        new DisassociateFacesCommand({
          CollectionId: collectionId,
          UserId: userId,
          FaceIds: [faceId],
        }),
      ),
    );
  }
}
