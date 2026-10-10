import 'dotenv/config';

export const sessionMaxAgeMs = 3 * 60 * 60 * 1000;
export const sessionCookieName = 'pln_emi.sid';
export const sessionSecret = getSessionSecret();
export const redisUrl = getRequiredEnvironmentVariable('REDIS_URL');
export const frontendOrigin = getFrontendOrigin();

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: sessionMaxAgeMs,
};

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}

function getSessionSecret(): string {
  const secret = getRequiredEnvironmentVariable('SESSION_SECRET');

  if (Buffer.byteLength(secret) < 32) {
    throw new Error('SESSION_SECRET must be at least 32 bytes long.');
  }

  return secret;
}

function getFrontendOrigin(): string {
  const configuredOrigin = getRequiredEnvironmentVariable('FRONTEND_ORIGIN');

  try {
    const url = new URL(configuredOrigin);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error();
    }

    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }

    return url.origin;
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid HTTP or HTTPS origin.');
  }
}
