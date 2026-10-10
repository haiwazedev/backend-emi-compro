import type { RequestHandler } from 'express';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { ApiError } from '../errors/api-error.js';
import {
  sessionCookieName,
  sessionCookieOptions,
  sessionMaxAgeMs,
  sessionSecret,
} from '../config/session.js';
import { redisClient } from '../db/redis.js';

const sessionHandler = session({
  name: sessionCookieName,
  store: new RedisStore({
    client: redisClient,
    prefix: 'pln-emi-server:sess:',
    ttl: sessionMaxAgeMs / 1000,
    disableTouch: true,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: sessionCookieOptions,
});

export const sessionMiddleware: RequestHandler = (req, res, next) => {
  sessionHandler(req, res, (error) => {
    if (error) {
      next(new ApiError(503, 'Session service is unavailable.'));
      return;
    }

    next();
  });
};
