import type { RequestHandler } from 'express';
import { redisClient } from '../db/redis.js';
import { ApiError } from '../errors/api-error.js';

type RateLimitOptions = {
  name: string;
  limit: number;
  windowSeconds: number;
  limitMessage: string;
  unavailableMessage: string;
};

const incrementCounterScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return { count, redis.call('TTL', KEYS[1]) }
`;

// Fixed-window limit per client IP, counted in Redis.
export function createRateLimit({
  name,
  limit,
  windowSeconds,
  limitMessage,
  unavailableMessage,
}: RateLimitOptions): RequestHandler {
  return async (req, res, next) => {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `rate-limit:${name}:${clientIp}`;

    try {
      const result = await redisClient.eval(incrementCounterScript, {
        keys: [key],
        arguments: [String(windowSeconds)],
      });

      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error('Unexpected Redis rate limit response.');
      }

      const [requestCount, remainingSeconds] = result.map(Number);

      if (
        !Number.isFinite(requestCount) ||
        !Number.isFinite(remainingSeconds)
      ) {
        throw new Error('Invalid Redis rate limit response.');
      }

      if (requestCount > limit) {
        res.setHeader('Retry-After', String(Math.max(1, remainingSeconds)));
        next(new ApiError(429, limitMessage));
        return;
      }

      next();
    } catch {
      next(new ApiError(503, unavailableMessage));
    }
  };
}
