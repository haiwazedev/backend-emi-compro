import { ApiError } from '../errors/api-error.js';
import { getPictureDimensions } from './picture-file.js';
import { sanitizeSvg } from './svg-file.js';

const IMAGE_EXTENSIONS: readonly string[] = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
];

export type ImageMetadata =
  { width: number; height: number } | Record<string, never>;

export type ProcessedImage = {
  buffer: Buffer;
  metadata: ImageMetadata;
};

export function processImageUpload(
  buffer: Buffer,
  extension: string,
  label: string,
): ProcessedImage {
  if (!IMAGE_EXTENSIONS.includes(extension)) {
    throw new ApiError(
      400,
      `${label} must be a PNG, JPG, JPEG, WEBP, or SVG file.`,
    );
  }

  if (extension === 'svg') {
    return { buffer: sanitizeSvg(buffer), metadata: {} };
  }

  return {
    buffer,
    metadata: getPictureDimensions(buffer, extension),
  };
}
