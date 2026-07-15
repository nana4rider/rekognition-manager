import type {
  AssociateFacesResponse,
  Collection,
  FaceListResponse,
  RegisterFaceResponse,
  UserDetailResponse,
  UserListResponse,
} from '@rekognition-manager/contracts';

import { ResourceNotFoundError } from './errors.js';
import type { RekognitionRepository } from './rekognition-repository.js';

export class RekognitionService {
  constructor(private readonly repository: RekognitionRepository) {}

  listCollections(limit: number, cursor?: string) {
    return this.repository.listCollections(limit, cursor);
  }

  getCollection(collectionId: string): Promise<Collection> {
    return this.repository.describeCollection(collectionId);
  }

  createCollection(collectionId: string): Promise<Collection> {
    return this.repository.createCollection(collectionId);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.repository.deleteCollection(collectionId);
  }

  listUsers(collectionId: string, limit: number, cursor?: string): Promise<UserListResponse> {
    return this.repository.listUsers(collectionId, limit, cursor);
  }

  async getUser(collectionId: string, userId: string): Promise<UserDetailResponse> {
    const user = await this.repository.findUser(collectionId, userId);
    if (!user) {
      throw new ResourceNotFoundError(`ユーザー「${userId}」が見つかりません`);
    }
    const faces = await this.repository.listFaces(collectionId, 100, undefined, userId);
    return { user, faces: faces.items, nextCursor: faces.nextCursor };
  }

  createUser(collectionId: string, userId: string) {
    return this.repository.createUser(collectionId, userId);
  }

  async deleteUser(collectionId: string, userId: string): Promise<void> {
    await this.repository.deleteUser(collectionId, userId);
  }

  listFaces(
    collectionId: string,
    limit: number,
    cursor?: string,
    userId?: string,
  ): Promise<FaceListResponse> {
    return this.repository.listFaces(collectionId, limit, cursor, userId);
  }

  registerFace(
    collectionId: string,
    bytes: Uint8Array,
    externalImageId?: string,
  ): Promise<RegisterFaceResponse> {
    const input = { collectionId, bytes } as {
      collectionId: string;
      bytes: Uint8Array;
      externalImageId?: string;
    };
    if (externalImageId) input.externalImageId = externalImageId;
    return this.repository.registerFace(input);
  }

  async deleteFace(collectionId: string, faceId: string): Promise<void> {
    await this.repository.deleteFace(collectionId, faceId);
  }

  associateFaces(
    collectionId: string,
    userId: string,
    faceIds: string[],
    userMatchThreshold?: number,
  ): Promise<AssociateFacesResponse> {
    return this.repository.associateFaces(collectionId, userId, faceIds, userMatchThreshold);
  }

  async disassociateFace(collectionId: string, userId: string, faceId: string): Promise<void> {
    await this.repository.disassociateFace(collectionId, userId, faceId);
  }
}
