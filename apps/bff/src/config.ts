import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  AWS_REGION: z.string().min(1).default('ap-northeast-1'),
  FACE_IMAGE_BUCKET_NAME: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse(process.env);
}
