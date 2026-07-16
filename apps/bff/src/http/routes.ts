import {
  associateFacesRequestSchema,
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
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { InvalidInputError } from '../application/errors.js';
import type { Logger } from '../application/logger.js';
import type { RekognitionService } from '../application/rekognition-service.js';
import type { AppEnv } from './types.js';
import { validationHook } from './validation.js';

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
    zValidator('query', collectionListQuerySchema, validationHook),
    async (context) => {
      const { limit, cursor } = context.req.valid('query');
      const response = await createService(context.get('logger')).listCollections(limit, cursor);
      return context.json(collectionListResponseSchema.parse(response));
    },
  );

  api.post(
    '/collections',
    zValidator('json', createCollectionRequestSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('json');
      const collection = await createService(context.get('logger')).createCollection(collectionId);
      return context.json(collectionSchema.parse(collection), 201);
    },
  );

  api.get(
    '/collections/:collectionId',
    zValidator('param', collectionParamsSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      const collection = await createService(context.get('logger')).getCollection(collectionId);
      return context.json(collectionSchema.parse(collection));
    },
  );

  api.delete(
    '/collections/:collectionId',
    zValidator('param', collectionParamsSchema, validationHook),
    async (context) => {
      const { collectionId } = context.req.valid('param');
      await createService(context.get('logger')).deleteCollection(collectionId);
      return context.body(null, 204);
    },
  );

  api.get(
    '/collections/:collectionId/users',
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
    zValidator('param', userParamsSchema, validationHook),
    async (context) => {
      const { collectionId, userId } = context.req.valid('param');
      const detail = await createService(context.get('logger')).getUser(collectionId, userId);
      return context.json(userDetailResponseSchema.parse(detail));
    },
  );

  api.delete(
    '/collections/:collectionId/users/:userId',
    zValidator('param', userParamsSchema, validationHook),
    async (context) => {
      const { collectionId, userId } = context.req.valid('param');
      await createService(context.get('logger')).deleteUser(collectionId, userId);
      return context.body(null, 204);
    },
  );

  api.post(
    '/collections/:collectionId/users/:userId/faces',
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
    zValidator('param', associationParamsSchema, validationHook),
    async (context) => {
      const { collectionId, userId, faceId } = context.req.valid('param');
      await createService(context.get('logger')).disassociateFace(collectionId, userId, faceId);
      return context.body(null, 204);
    },
  );

  api.get(
    '/collections/:collectionId/faces',
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
    zValidator('param', faceParamsSchema, validationHook),
    async (context) => {
      const { collectionId, faceId } = context.req.valid('param');
      await createService(context.get('logger')).deleteFace(collectionId, faceId);
      return context.body(null, 204);
    },
  );

  return api;
}
