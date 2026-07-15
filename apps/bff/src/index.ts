import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { serve } from '@hono/node-server';

import { RekognitionService } from './application/rekognition-service.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { AwsRekognitionRepository } from './infrastructure/aws-rekognition-repository.js';
import { createRootLogger } from './infrastructure/pino-logger.js';

const config = loadConfig();
const rootLogger = createRootLogger(config);
const client = new RekognitionClient({ region: config.AWS_REGION });
const app = createApp(
  rootLogger,
  (requestLogger) => new RekognitionService(new AwsRekognitionRepository(client, requestLogger)),
);

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  rootLogger.info({ port: info.port, region: config.AWS_REGION }, 'BFF started');
});

function shutdown(signal: string) {
  rootLogger.info({ signal }, 'BFF shutting down');
  server.close((error) => {
    client.destroy();
    if (error) {
      rootLogger.error({ err: error }, 'BFF shutdown failed');
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
