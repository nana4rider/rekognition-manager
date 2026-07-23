import {
  associateFacesRequestSchema,
  associateFacesResponseSchema,
  collectionIdSchema,
  collectionListQuerySchema,
  collectionListResponseSchema,
  collectionSchema,
  createCollectionRequestSchema,
  createUserRequestSchema,
  externalImageIdSchema,
  faceIdSchema,
  faceListQuerySchema,
  faceListResponseSchema,
  registerFaceResponseSchema,
  searchUsersByImageOptionsSchema,
  searchUsersByImageResponseSchema,
  userDetailResponseSchema,
  userIdSchema,
  userListQuerySchema,
  userListResponseSchema,
} from '@rekognition-manager/contracts';
import { Hono } from 'hono';
import { validator as zValidator } from 'hono-openapi';
import { z } from 'zod';

import { InvalidInputError } from '../application/errors.js';
import type { Logger } from '../application/logger.js';
import type { RekognitionService } from '../application/rekognition-service.js';
import type { AppEnv } from './types.js';
import { validationHook } from './validation.js';
import {
  apiRoute,
  imageSearchRequest,
  imageUploadRequest,
  jsonResponse,
  noContentResponse,
} from './openapi.js';

const collectionParamsSchema = z.object({ collectionId: collectionIdSchema });
const userParamsSchema = z.object({ collectionId: collectionIdSchema, userId: userIdSchema });
const faceParamsSchema = z.object({ collectionId: collectionIdSchema, faceId: faceIdSchema });
const associationParamsSchema = z.object({
  collectionId: collectionIdSchema,
  userId: userIdSchema,
  faceId: faceIdSchema,
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

export type ServiceFactory = (logger: Logger) => RekognitionService;

export function createApiRoutes(createService: ServiceFactory): Hono<AppEnv> {
  const api = new Hono<AppEnv>();

  api.get(
    '/collections',
    apiRoute({
      operationId: 'listCollections',
      summary: 'コレクション一覧を取得する',
      tags: ['Collections'],
      responses: { 200: jsonResponse('コレクション一覧', collectionListResponseSchema) },
    }),
    zValidator('query', collectionListQuerySchema, validationHook),
    async (context) => {
      const { limit, cursor } = context.req.valid('query');
      const response = await createService(context.get('logger')).listCollections(limit, cursor);
      return context.json(collectionListResponseSchema.parse(response));
    },
  );

  api.post(
    '/collections',
    apiRoute({
      operationId: 'createCollection',
      summary: 'コレクションを作成する',
      tags: ['Collections'],
      responses: { 201: jsonResponse('作成したコレクション', collectionSchema) },
    }),
    zValidator('json', createCollectionRequestSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('json');
      const collection = await createService(context.get('logger')).createCollection(collectionId);
      return context.json(collectionSchema.parse(collection), 201);
    },
  );

  api.get(
    '/collections/:collectionId',
    apiRoute({
      operationId: 'getCollection',
      summary: 'コレクション詳細を取得する',
      tags: ['Collections'],
      responses: { 200: jsonResponse('コレクション詳細', collectionSchema) },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const collection = await createService(context.get('logger')).getCollection(collectionId);
      return context.json(collectionSchema.parse(collection));
    },
  );

  api.delete(
    '/collections/:collectionId',
    apiRoute({
      operationId: 'deleteCollection',
      summary: 'コレクションを削除する',
      tags: ['Collections'],
      responses: { 204: noContentResponse },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      await createService(context.get('logger')).deleteCollection(collectionId);
      return context.body(null, 204);
    },
  );

  api.get(
    '/collections/:collectionId/users',
    apiRoute({
      operationId: 'listUsers',
      summary: 'ユーザー一覧を取得する',
      tags: ['Users'],
      responses: { 200: jsonResponse('ユーザー一覧', userListResponseSchema) },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    zValidator('query', userListQuerySchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const { limit, cursor } = context.req.valid('query');
      const response = await createService(context.get('logger')).listUsers(
        collectionId,
        limit,
        cursor,
      );
      return context.json(userListResponseSchema.parse(response));
    },
  );

  api.post(
    '/collections/:collectionId/users',
    apiRoute({
      operationId: 'createUser',
      summary: 'ユーザーを作成する',
      tags: ['Users'],
      responses: { 201: jsonResponse('作成したユーザー', userDetailResponseSchema.shape.user) },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    zValidator('json', createUserRequestSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const { userId } = context.req.valid('json');
      const user = await createService(context.get('logger')).createUser(collectionId, userId);
      return context.json(user, 201);
    },
  );

  api.get(
    '/collections/:collectionId/users/:userId',
    apiRoute({
      operationId: 'getUser',
      summary: 'ユーザー詳細を取得する',
      tags: ['Users'],
      responses: { 200: jsonResponse('ユーザー詳細', userDetailResponseSchema) },
    }),
    zValidator('param', userParamsSchema, validationHook),
    async (context) => {
      const { collectionId, userId } = context.req.valid('param');
      const detail = await createService(context.get('logger')).getUser(collectionId, userId);
      return context.json(userDetailResponseSchema.parse(detail));
    },
  );

  api.delete(
    '/collections/:collectionId/users/:userId',
    apiRoute({
      operationId: 'deleteUser',
      summary: 'ユーザーを削除する',
      tags: ['Users'],
      responses: { 204: noContentResponse },
    }),
    zValidator('param', userParamsSchema, validationHook),
    async (context) => {
      const { collectionId, userId } = context.req.valid('param');
      await createService(context.get('logger')).deleteUser(collectionId, userId);
      return context.body(null, 204);
    },
  );

  api.post(
    '/collections/:collectionId/users/:userId/faces',
    apiRoute({
      operationId: 'associateFaces',
      summary: '顔をユーザーへ関連付ける',
      tags: ['Users', 'Faces'],
      responses: { 200: jsonResponse('関連付け結果', associateFacesResponseSchema) },
    }),
    zValidator('param', userParamsSchema, validationHook),
    zValidator('json', associateFacesRequestSchema, validationHook),
    async (context) => {
      const { collectionId, userId } = context.req.valid('param');
      const { faceIds, userMatchThreshold } = context.req.valid('json');
      const result = await createService(context.get('logger')).associateFaces(
        collectionId,
        userId,
        faceIds,
        userMatchThreshold,
      );
      return context.json(result);
    },
  );

  api.delete(
    '/collections/:collectionId/users/:userId/faces/:faceId',
    apiRoute({
      operationId: 'disassociateFace',
      summary: '顔とユーザーの関連付けを解除する',
      tags: ['Users', 'Faces'],
      responses: { 204: noContentResponse },
    }),
    zValidator('param', associationParamsSchema, validationHook),
    async (context) => {
      const { collectionId, userId, faceId } = context.req.valid('param');
      await createService(context.get('logger')).disassociateFace(collectionId, userId, faceId);
      return context.body(null, 204);
    },
  );

  api.get(
    '/collections/:collectionId/faces',
    apiRoute({
      operationId: 'listFaces',
      summary: '顔一覧を取得する',
      tags: ['Faces'],
      responses: { 200: jsonResponse('顔一覧', faceListResponseSchema) },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    zValidator('query', faceListQuerySchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const { limit, cursor, userId } = context.req.valid('query');
      const response = await createService(context.get('logger')).listFaces(
        collectionId,
        limit,
        cursor,
        userId,
      );
      return context.json(faceListResponseSchema.parse(response));
    },
  );

  api.post(
    '/collections/:collectionId/faces',
    apiRoute({
      operationId: 'registerFace',
      summary: '顔を登録する',
      tags: ['Faces'],
      requestBody: imageUploadRequest,
      responses: { 201: jsonResponse('顔登録結果', registerFaceResponseSchema) },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const formData = await context.req.formData();
      const image = formData.get('image');
      if (!(image instanceof File)) {
        throw new InvalidInputError('顔画像を選択してください');
      }
      if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
        throw new InvalidInputError('JPEGまたはPNG形式の画像を選択してください');
      }
      if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
        throw new InvalidInputError('画像のサイズは1バイト以上5MB以下にしてください');
      }
      const rawExternalImageId = formData.get('externalImageId');
      const externalImageId = externalImageIdSchema.parse(
        typeof rawExternalImageId === 'string' && rawExternalImageId !== ''
          ? rawExternalImageId
          : undefined,
      );
      const response = await createService(context.get('logger')).registerFace(
        collectionId,
        new Uint8Array(await image.arrayBuffer()),
        externalImageId,
        image.type,
      );
      return context.json(registerFaceResponseSchema.parse(response), 201);
    },
  );

  api.post(
    '/collections/:collectionId/search/users-by-image',
    apiRoute({
      operationId: 'searchUsersByImage',
      summary: '画像からユーザーを検索する',
      tags: ['Search'],
      requestBody: imageSearchRequest,
      responses: { 200: jsonResponse('検索結果', searchUsersByImageResponseSchema) },
    }),
    zValidator('param', collectionParamsSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const formData = await context.req.formData();
      const image = formData.get('image');
      if (!(image instanceof File)) {
        throw new InvalidInputError('検索する顔画像を選択してください');
      }
      if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
        throw new InvalidInputError('JPEGまたはPNG形式の画像を選択してください');
      }
      if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
        throw new InvalidInputError('画像のサイズは1バイト以上5MB以下にしてください');
      }
      const options = searchUsersByImageOptionsSchema.parse({
        userMatchThreshold: formData.get('userMatchThreshold') ?? undefined,
        maxUsers: formData.get('maxUsers') ?? undefined,
      });
      const response = await createService(context.get('logger')).searchUsersByImage(
        collectionId,
        new Uint8Array(await image.arrayBuffer()),
        options.userMatchThreshold,
        options.maxUsers,
      );
      return context.json(searchUsersByImageResponseSchema.parse(response));
    },
  );

  api.get(
    '/collections/:collectionId/faces/:faceId/image',
    apiRoute({
      operationId: 'getFaceImage',
      summary: '顔画像を取得する',
      tags: ['Faces'],
      responses: {
        200: {
          description: '顔画像',
          content: {
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
          },
        },
      },
    }),
    zValidator('param', faceParamsSchema, validationHook),
    async (context) => {
      const { collectionId, faceId } = context.req.valid('param');
      const image = await createService(context.get('logger')).getFaceImage(collectionId, faceId);
      if (!image) {
        return context.body(null, 404);
      }
      return context.body(image.body, 200, {
        'Content-Type': image.contentType,
        'Cache-Control': 'private, no-store',
      });
    },
  );

  api.delete(
    '/collections/:collectionId/faces/:faceId',
    apiRoute({
      operationId: 'deleteFace',
      summary: '顔を削除する',
      tags: ['Faces'],
      responses: { 204: noContentResponse },
    }),
    zValidator('param', faceParamsSchema, validationHook),
    async (context) => {
      const { collectionId, faceId } = context.req.valid('param');
      await createService(context.get('logger')).deleteFace(collectionId, faceId);
      return context.body(null, 204);
    },
  );

  return api;
}
