import type {
  AssociateFacesResponse,
  Collection,
  Face,
  RegisterFaceResponse,
  User,
} from '@rekognition-manager/contracts';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface RegisterFaceInput {
  collectionId: string;
  bytes: Uint8Array;
  externalImageId?: string;
}

export interface RekognitionRepository {
  listCollections(limit: number, cursor?: string): Promise<Page<Collection>>;
  describeCollection(collectionId: string): Promise<Collection>;
  createCollection(collectionId: string): Promise<Collection>;
  deleteCollection(collectionId: string): Promise<void>;

  listUsers(collectionId: string, limit: number, cursor?: string): Promise<Page<User>>;
  findUser(collectionId: string, userId: string): Promise<User | null>;
  createUser(collectionId: string, userId: string): Promise<User>;
  deleteUser(collectionId: string, userId: string): Promise<void>;

  listFaces(
    collectionId: string,
    limit: number,
    cursor?: string,
    userId?: string,
  ): Promise<Page<Face>>;
  registerFace(input: RegisterFaceInput): Promise<RegisterFaceResponse>;
  deleteFace(collectionId: string, faceId: string): Promise<void>;

  associateFaces(
    collectionId: string,
    userId: string,
    faceIds: string[],
    userMatchThreshold?: number,
  ): Promise<AssociateFacesResponse>;
  disassociateFace(collectionId: string, userId: string, faceId: string): Promise<void>;
}
