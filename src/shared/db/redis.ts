import { createClient } from 'redis';
import { redisUrl } from '../config/session.js';
import { logger } from '../logging/logger.js';

export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (error) => {
  logger.error(
    { err: error, component: 'redis', operation: 'session_client_error' },
    'Redis session client error.',
  );
});

export async function connectRedis(): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      redisClient.connect(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          redisClient.destroy();
          reject(new Error('Redis connection timed out.'));
        }, 10_000);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
