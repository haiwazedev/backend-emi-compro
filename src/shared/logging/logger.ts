import 'dotenv/config';
import pino from 'pino';
import { OpenObserveTransport } from './openobserve-transport.js';

const openObserveTransport = new OpenObserveTransport();
const destination = pino.multistream([
  { stream: process.stdout },
  { stream: openObserveTransport },
]);
const validLogLevels = new Set([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]);

export const logger = pino(
  {
    level: getLogLevel(),
    base: {
      service: 'pln-emi-server',
      environment: process.env.NODE_ENV || 'development',
    },
    messageKey: 'message',
    timestamp: () => `,"_timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    redact: {
      paths: [
        'password',
        '*.password',
        'token',
        '*.token',
        'accessToken',
        '*.accessToken',
        'refreshToken',
        '*.refreshToken',
        'access_token',
        '*.access_token',
        'refresh_token',
        '*.refresh_token',
        'secret',
        '*.secret',
        'secretKey',
        '*.secretKey',
        'secret_key',
        '*.secret_key',
        'authorization',
        '*.authorization',
        'cookie',
        '*.cookie',
        'set-cookie',
        '*.set-cookie',
        'apiKey',
        '*.apiKey',
        'api_key',
        '*.api_key',
        'clientSecret',
        '*.clientSecret',
        'client_secret',
        '*.client_secret',
      ],
      censor: '[REDACTED]',
    },
  },
  destination,
);

export async function shutdownLogger(): Promise<void> {
  destination.flushSync();
  await openObserveTransport.close(5_000);
}

function getLogLevel(): string {
  const configuredLevel = process.env.LOG_LEVEL?.trim().toLowerCase() || 'info';

  if (validLogLevels.has(configuredLevel)) {
    return configuredLevel;
  }

  process.stderr.write(
    `Invalid LOG_LEVEL "${configuredLevel}"; using "info".\n`,
  );
  return 'info';
}
