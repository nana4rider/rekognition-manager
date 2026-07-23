import { errorResponseSchema } from '@rekognition-manager/contracts';
import { describeRoute, resolver } from 'hono-openapi';
import type { DescribeRouteOptions, ResponsesWithResolver } from 'hono-openapi';
import type { ZodType } from 'zod';

const errorContent = {
  'application/json': {
    schema: resolver(errorResponseSchema),
  },
};

export function apiRoute(options: {
  operationId: string;
  summary: string;
  tags: string[];
  responses: ResponsesWithResolver;
  requestBody?: DescribeRouteOptions['requestBody'];
}) {
  const { requestBody, ...operation } = options;
  return describeRoute({
    ...operation,
    ...(requestBody ? { requestBody } : {}),
    responses: {
      ...options.responses,
      400: { description: '入力エラー', content: errorContent },
      404: { description: '対象が見つかりません', content: errorContent },
      500: { description: 'サーバーエラー', content: errorContent },
    },
  });
}

export function jsonResponse(
  description: string,
  schema: ZodType,
): Exclude<ResponsesWithResolver[string], undefined> {
  return {
    description,
    content: {
      'application/json': {
        schema: resolver(schema),
      },
    },
  };
}

export const noContentResponse = { description: '正常に完了しました' };

export const imageUploadRequest = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['image'],
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            description: 'JPEGまたはPNG形式、5MB以下',
          },
          externalImageId: { type: 'string' },
        },
      },
    },
  },
} satisfies NonNullable<DescribeRouteOptions['requestBody']>;

export const imageSearchRequest = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['image'],
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            description: 'JPEGまたはPNG形式、5MB以下',
          },
          userMatchThreshold: { type: 'number', minimum: 0, maximum: 100, default: 80 },
          maxUsers: { type: 'integer', minimum: 1, maximum: 500, default: 10 },
        },
      },
    },
  },
} satisfies NonNullable<DescribeRouteOptions['requestBody']>;
