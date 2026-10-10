import { createClient } from 'redis';
import { redisUrl } from '../config/session.js';

export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (error) => {
  console.error('Redis session client error.', error);
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
