import type { Request, Response } from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { logger } from '../logging/logger.js';

export const requestLoggingMiddleware = pinoHttp<Request, Response>({
  logger,
  autoLogging: {
    ignore: (request) =>
      request.method === 'OPTIONS' || request.path === '/health',
  },
  customLogLevel: (_request, response, error) => {
    if (error || response.statusCode >= 500) {
      return 'error';
    }

    if (response.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
  customSuccessMessage: () => 'HTTP request completed.',
  customErrorMessage: () => 'HTTP request failed.',
  customSuccessObject: (request, response, context) => ({
    request: {
      method: request.method,
      route: getRoute(request),
    },
    statusCode: response.statusCode,
    durationMs: context.responseTime,
  }),
  customErrorObject: (request, response, error, context) => ({
    request: {
      method: request.method,
      route: getRoute(request),
    },
    statusCode: response.statusCode,
    durationMs: context.responseTime,
    err: error,
  }),
  serializers: {
    req: (request: Request) => ({ method: request.method }),
    res: (response: Response) => ({ statusCode: response.statusCode }),
    err: pino.stdSerializers.err,
  },
});

function getRoute(request: Request): string {
  const routePath = request.route?.path;
  const path = Array.isArray(routePath) ? routePath[0] : routePath;

  if (typeof path !== 'string') {
    return 'unmatched';
  }

  const route = `${request.baseUrl}${path}`;
  return route.startsWith('/') ? route : `/${route}`;
}
