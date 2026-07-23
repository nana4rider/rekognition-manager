import { pino, type Logger as PinoLogger, type LoggerOptions } from 'pino';

import type { AppConfig } from '../config.js';

export function createRootLogger(config: AppConfig): PinoLogger {
  const options: LoggerOptions = {
    level: config.LOG_LEVEL,
    base: { service: 'rekognition-manager-bff' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        'authorization',
        'cookie',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_SESSION_TOKEN',
        'OIDC_CLIENT_SECRET',
        'OIDC_AUTH_SECRET',
        'image',
        'bytes',
        '*.image',
        '*.bytes',
      ],
      censor: '[REDACTED]',
    },
  };
  if (config.NODE_ENV === 'development') {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    };
  }
  return pino(options);
}
