import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ApiError } from '../errors/api-error.js';

const purify = createDOMPurify(new JSDOM('').window);

// Strips scripts, event handlers, foreignObject and javascript: links from SVG markup.
export function sanitizeSvg(buffer: Buffer): Buffer {
  const sanitized = purify.sanitize(buffer.toString('utf8'), {
    USE_PROFILES: { svg: true, svgFilters: true },
  });

  if (!/^<svg[\s>]/i.test(sanitized.trim())) {
    throw new ApiError(400, 'SVG file is invalid.');
  }

  return Buffer.from(sanitized, 'utf8');
}
