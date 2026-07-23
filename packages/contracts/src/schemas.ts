import { z } from 'zod';

export const collectionIdSchema = z
  .string()
  .min(1, 'コレクションIDを入力してください')
  .max(255, 'コレクションIDは255文字以内で入力してください')
  .regex(/^[a-zA-Z0-9_.-]+$/, '英数字、ピリオド、アンダースコア、ハイフンを使用できます');

export const userIdSchema = z
  .string()
  .min(1, 'ユーザーIDを入力してください')
  .max(128, 'ユーザーIDは128文字以内で入力してください')
  .regex(/^[a-zA-Z0-9_.:-]+$/, '英数字、ピリオド、アンダースコア、ハイフン、コロンを使用できます');

export const faceIdSchema = z.uuid('Face IDの形式が正しくありません');
export const cursorSchema = z.string().min(1).optional();
export const limitSchema = z.coerce.number().int().min(1).max(100).default(50);

export const collectionSchema = z.object({
  collectionId: collectionIdSchema,
  faceModelVersion: z.string().optional(),
  creationTimestamp: z.string().datetime().optional(),
  faceCount: z.number().int().nonnegative().optional(),
  userCount: z.number().int().nonnegative().optional(),
});

export const createCollectionRequestSchema = z.object({ collectionId: collectionIdSchema });
export const collectionListQuerySchema = z.object({ cursor: cursorSchema, limit: limitSchema });
export const collectionListResponseSchema = z.object({
  items: z.array(collectionSchema),
  nextCursor: z.string().nullable(),
});

export const userStatusSchema = z.enum(['ACTIVE', 'UPDATING', 'CREATING', 'CREATED']);
export const userSchema = z.object({
  userId: userIdSchema,
  userStatus: userStatusSchema.optional(),
});
export const createUserRequestSchema = z.object({ userId: userIdSchema });
export const userListQuerySchema = z.object({ cursor: cursorSchema, limit: limitSchema });
export const userListResponseSchema = z.object({
  items: z.array(userSchema),
  nextCursor: z.string().nullable(),
});

export const faceSchema = z.object({
  faceId: faceIdSchema,
  imageId: z.string().optional(),
  externalImageId: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  userId: userIdSchema.optional(),
});
export const faceListQuerySchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
  userId: userIdSchema.optional(),
});
export const faceListResponseSchema = z.object({
  items: z.array(faceSchema),
  nextCursor: z.string().nullable(),
});

export const userDetailResponseSchema = z.object({
  user: userSchema,
  faces: z.array(faceSchema),
  nextCursor: z.string().nullable(),
});

export const externalImageIdSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9_.:-]+$/)
  .optional();
export const registerFaceResponseSchema = z.object({
  faces: z.array(faceSchema),
  unindexedFaceCount: z.number().int().nonnegative(),
});

export const searchUsersByImageOptionsSchema = z.object({
  userMatchThreshold: z.coerce.number().min(0).max(100).default(80),
  maxUsers: z.coerce.number().int().min(1).max(500).default(10),
});
export const userImageMatchSchema = z.object({
  userId: userIdSchema,
  userStatus: userStatusSchema.optional(),
  similarity: z.number().min(0).max(100),
});
export const searchUsersByImageResponseSchema = z.object({
  matches: z.array(userImageMatchSchema),
  searchedFaceFound: z.boolean(),
  unsearchedFaceCount: z.number().int().nonnegative(),
});

export const associateFacesRequestSchema = z.object({
  faceIds: z.array(faceIdSchema).min(1).max(100),
  userMatchThreshold: z.number().min(0).max(100).optional(),
});
export const associateFacesResponseSchema = z.object({
  associatedFaceIds: z.array(faceIdSchema),
  unsuccessful: z.array(
    z.object({
      faceId: faceIdSchema.optional(),
      userId: userIdSchema.optional(),
      confidence: z.number().optional(),
      reasons: z.array(z.string()),
    }),
  ),
  userStatus: userStatusSchema.optional(),
});

export const successResponseSchema = z.object({ success: z.literal(true) });
export const authStatusResponseSchema = z.object({
  enabled: z.boolean(),
  providerName: z.string().min(1).nullable(),
  sessionCookieName: z.string().min(1).nullable(),
});
export const currentUserResponseSchema = z.object({
  displayName: z.string().min(1),
});
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type Collection = z.infer<typeof collectionSchema>;
export type CreateCollectionRequest = z.infer<typeof createCollectionRequestSchema>;
export type CollectionListResponse = z.infer<typeof collectionListResponseSchema>;
export type User = z.infer<typeof userSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>;
export type Face = z.infer<typeof faceSchema>;
export type FaceListResponse = z.infer<typeof faceListResponseSchema>;
export type RegisterFaceResponse = z.infer<typeof registerFaceResponseSchema>;
export type SearchUsersByImageOptions = z.infer<typeof searchUsersByImageOptionsSchema>;
export type SearchUsersByImageResponse = z.infer<typeof searchUsersByImageResponseSchema>;
export type UserImageMatch = z.infer<typeof userImageMatchSchema>;
export type AssociateFacesRequest = z.infer<typeof associateFacesRequestSchema>;
export type AssociateFacesResponse = z.infer<typeof associateFacesResponseSchema>;
export type AuthStatusResponse = z.infer<typeof authStatusResponseSchema>;
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
