import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { serve } from '@hono/node-server';

import { RekognitionService } from './application/rekognition-service.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { createOidcHandlers } from './http/oidc.js';
import { AwsRekognitionRepository } from './infrastructure/aws-rekognition-repository.js';
import { createRootLogger } from './infrastructure/pino-logger.js';

const config = loadConfig();
const rootLogger = createRootLogger(config);
const client = new RekognitionClient({ region: config.AWS_REGION });
const s3Client = new S3Client({ region: config.AWS_REGION });
const oidc =
  config.OIDC_ENABLED &&
  config.OIDC_ISSUER_URL &&
  config.OIDC_CLIENT_ID &&
  config.OIDC_CLIENT_SECRET &&
  config.OIDC_AUTH_SECRET &&
  config.APP_ORIGIN
    ? createOidcHandlers({
        ...config,
        OIDC_ISSUER_URL: config.OIDC_ISSUER_URL,
        OIDC_CLIENT_ID: config.OIDC_CLIENT_ID,
        OIDC_CLIENT_SECRET: config.OIDC_CLIENT_SECRET,
        OIDC_AUTH_SECRET: config.OIDC_AUTH_SECRET,
        APP_ORIGIN: config.APP_ORIGIN,
      })
    : undefined;
const app = createApp(
  rootLogger,
  (requestLogger) =>
    new RekognitionService(
      new AwsRekognitionRepository(client, requestLogger, s3Client, config.FACE_IMAGE_BUCKET_NAME),
    ),
  oidc,
);

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  rootLogger.info(
    { port: info.port, region: config.AWS_REGION, oidcEnabled: config.OIDC_ENABLED },
    'BFF started',
  );
});

function shutdown(signal: string) {
  rootLogger.info({ signal }, 'BFF shutting down');
  server.close((error) => {
    client.destroy();
    s3Client.destroy();
    if (error) {
      rootLogger.error({ err: error }, 'BFF shutdown failed');
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
