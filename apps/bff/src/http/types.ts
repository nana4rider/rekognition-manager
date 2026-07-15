import type { Logger as PinoLogger } from 'pino';

export interface AppEnv {
  Variables: {
    logger: PinoLogger;
    requestId: string;
  };
}
