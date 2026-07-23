import type { GenerateSpecOptions } from 'hono-openapi';

export function createOpenApiOptions(version: string) {
  return {
    documentation: {
      info: {
        title: 'Rekognition Manager BFF API',
        version,
        description: 'Amazon Rekognitionのコレクション、ユーザー、顔を管理するBFF API',
      },
      servers: [{ url: 'http://localhost:3001', description: 'ローカルBFF' }],
      tags: [
        { name: 'Collections', description: 'コレクション管理' },
        { name: 'Users', description: 'ユーザー管理' },
        { name: 'Faces', description: '顔管理' },
        { name: 'Search', description: '画像検索' },
      ],
    },
    includeEmptyPaths: true,
    exclude: /^(?!\/api\/v1(?:\/|$))/,
  } satisfies Partial<GenerateSpecOptions>;
}
