import type { RequestHandler } from 'express';
import { createRateLimit } from '../../../shared/middlewares/rate-limit.middleware.js';

const submissionRateLimit = createRateLimit({
  name: 'inbox-submission',
  limit: 5,
  windowSeconds: 15 * 60,
  limitMessage: 'Too many contact form submissions. Please try again later.',
  unavailableMessage: 'Contact form submissions are temporarily unavailable.',
});

export const inboxSubmissionRateLimit: RequestHandler = (req, res, next) => {
  if (req.method !== 'POST' || req.path !== '/inboxes') {
    next();
    return;
  }

  return submissionRateLimit(req, res, next);
};
