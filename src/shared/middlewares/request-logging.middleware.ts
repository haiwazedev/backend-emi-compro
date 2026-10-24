import type { Request, Response } from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { logger } from '../logging/logger.js';

export type RequestErrorLogContext = {
  errorType: string;
  errorMessage: string;
  errorCode?: string;
  validationPath?: string;
  err?: unknown;
};

export const requestLoggingMiddleware = pinoHttp<Request, Response>({
  logger,
  customLogLevel: (request, response, error) => {
    if (
      response.statusCode < 400 &&
      (request.method === 'OPTIONS' || request.path === '/health')
    ) {
      return 'silent';
    }

    if (
      response.statusCode >= 500 ||
      (error !== undefined && response.statusCode < 400)
    ) {
      return 'error';
    }

    if (response.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
  customSuccessMessage: (request, response) =>
    response.statusCode >= 400
      ? buildFailureMessage(request, response)
      : 'HTTP request completed.',
  customErrorMessage: (request, response, error) =>
    buildFailureMessage(request, response, error),
  customSuccessObject: (request, response, context) =>
    buildRequestLogFields(request, response, context.responseTime),
  customErrorObject: (request, response, error, context) => {
    const errorContext = getErrorContext(response);

    return {
      ...buildRequestLogFields(request, response, context.responseTime),
      ...(response.statusCode >= 500 && {
        err: errorContext?.err ?? error,
      }),
    };
  },
  serializers: {
    req: (request: Request) => ({ method: request.method }),
    res: (response: Response) => ({ statusCode: response.statusCode }),
    err: pino.stdSerializers.err,
  },
});

function buildRequestLogFields(
  request: Request,
  response: Response,
  durationMs: number,
): Record<string, unknown> {
  const failed = response.statusCode >= 400;
  const errorContext = failed ? getErrorContext(response) : undefined;

  return {
    eventType: failed ? 'request_error' : 'http_request',
    request: {
      method: request.method,
      route: getRoute(request),
    },
    statusCode: response.statusCode,
    durationMs,
    ...(failed && {
      errorType: errorContext?.errorType ?? 'HttpError',
      errorMessage:
        errorContext?.errorMessage ??
        'Request returned an unsuccessful status.',
      ...(errorContext?.errorCode && { errorCode: errorContext.errorCode }),
      ...(errorContext?.validationPath && {
        validationPath: errorContext.validationPath,
      }),
      ...(response.statusCode >= 500 && errorContext?.err !== undefined
        ? { err: errorContext.err }
        : {}),
    }),
  };
}

function buildFailureMessage(
  request: Request,
  response: Response,
  error?: Error,
): string {
  const errorContext = getErrorContext(response);
  const route = getRoute(request);
  const errorMessage =
    errorContext?.errorMessage ??
    (response.statusCode >= 500 ? error?.message : undefined) ??
    'Request failed.';
  const reason = errorContext?.validationPath
    ? `${errorContext.validationPath}: ${errorMessage}`
    : errorMessage;

  return `${request.method} ${route} failed with status ${response.statusCode}: ${reason}`;
}

function getErrorContext(
  response: Response,
): RequestErrorLogContext | undefined {
  return response.locals.requestErrorContext as
    RequestErrorLogContext | undefined;
}

function getRoute(request: Request): string {
  const routePath = request.route?.path;
  const path = Array.isArray(routePath) ? routePath[0] : routePath;

  if (typeof path !== 'string') {
    return 'unmatched';
  }

  const route = `${request.baseUrl}${path}`;
  return route.startsWith('/') ? route : `/${route}`;
}
