import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ApiError } from '../errors/api-error.js';

const purify = createDOMPurify(new JSDOM('').window);

// Strips scripts, event handlers, foreignObject and javascript: links from SVG markup.
export function sanitizeSvgMarkup(markup: string): string {
  const sanitized = purify
    .sanitize(markup, { USE_PROFILES: { svg: true, svgFilters: true } })
    .trim();

  if (!/^<svg[\s>]/i.test(sanitized)) {
    throw new ApiError(400, 'SVG file is invalid.');
  }

  return sanitized;
}

export function sanitizeSvgMarkupOrNull(markup: string | null): string | null {
  if (markup === null) return null;

  try {
    return sanitizeSvgMarkup(markup);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 400) return null;
    throw error;
  }
}

export function sanitizeSvg(buffer: Buffer): Buffer {
  return Buffer.from(sanitizeSvgMarkup(buffer.toString('utf8')), 'utf8');
}
