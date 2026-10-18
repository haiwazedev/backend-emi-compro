import type { RequestHandler } from 'express';
import { redisClient } from '../../../shared/db/redis.js';
import { ApiError } from '../../../shared/errors/api-error.js';

const submissionLimit = 5;
const submissionWindowSeconds = 15 * 60;

const incrementSubmissionCounterScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return { count, redis.call('TTL', KEYS[1]) }
`;

export const inboxSubmissionRateLimit: RequestHandler = async (
  req,
  res,
  next,
) => {
  if (req.method !== 'POST' || req.path !== '/inboxes') {
    next();
    return;
  }

  const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const key = `rate-limit:inbox-submission:${clientIp}`;

  try {
    const result = await redisClient.eval(incrementSubmissionCounterScript, {
      keys: [key],
      arguments: [String(submissionWindowSeconds)],
    });

    if (!Array.isArray(result) || result.length !== 2) {
      throw new Error('Unexpected Redis rate limit response.');
    }

    const [requestCount, remainingSeconds] = result.map(Number);

    if (!Number.isFinite(requestCount) || !Number.isFinite(remainingSeconds)) {
      throw new Error('Invalid Redis rate limit response.');
    }

    if (requestCount > submissionLimit) {
      res.setHeader('Retry-After', String(Math.max(1, remainingSeconds)));
      next(
        new ApiError(
          429,
          'Too many contact form submissions. Please try again later.',
        ),
      );
      return;
    }

    next();
  } catch {
    next(
      new ApiError(
        503,
        'Contact form submissions are temporarily unavailable.',
      ),
    );
  }
};
