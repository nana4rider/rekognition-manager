import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

function findEnvFile(startDir: string): string | undefined {
  let currentDir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(currentDir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return undefined;
}

const envFile = findEnvFile(process.cwd());
if (envFile) {
  dotenv.config({ path: envFile, quiet: true });
}

const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    AWS_REGION: z.string().min(1).default('ap-northeast-1'),
    FACE_IMAGE_BUCKET_NAME: z.string().min(1).optional(),
    OIDC_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    OIDC_ISSUER_URL: z.url().optional(),
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    OIDC_AUTH_SECRET: z.string().min(32).optional(),
    OIDC_PROVIDER_NAME: z.string().min(1).default('OIDC'),
    OIDC_AUDIENCE: z.string().min(1).optional(),
    APP_ORIGIN: z.url().optional(),
  })
  .superRefine((config, context) => {
    if (!config.OIDC_ENABLED) return;
    if (!config.OIDC_ISSUER_URL) {
      context.addIssue({
        code: 'custom',
        path: ['OIDC_ISSUER_URL'],
        message: 'OIDC有効時は必須です',
      });
    }
    if (!config.OIDC_CLIENT_ID) {
      context.addIssue({
        code: 'custom',
        path: ['OIDC_CLIENT_ID'],
        message: 'OIDC有効時は必須です',
      });
    }
    if (!config.OIDC_CLIENT_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['OIDC_CLIENT_SECRET'],
        message: 'OIDC有効時は必須です',
      });
    }
    if (!config.OIDC_AUTH_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['OIDC_AUTH_SECRET'],
        message: 'OIDC有効時は32文字以上で指定してください',
      });
    }
    if (!config.APP_ORIGIN) {
      context.addIssue({
        code: 'custom',
        path: ['APP_ORIGIN'],
        message: 'OIDC有効時は必須です',
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse(process.env);
}
