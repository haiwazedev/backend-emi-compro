import { ApiError } from '../errors/api-error.js';

export function getPictureDimensions(
  buffer: Buffer,
  extension: string,
): { width: number; height: number } {
  if (extension === 'png') {
    if (
      buffer.length < 24 ||
      !buffer
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ) ||
      buffer.toString('ascii', 12, 16) !== 'IHDR'
    ) {
      throw new ApiError(
        400,
        'Picture content does not match its file extension.',
      );
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width === 0 || height === 0) {
      throw new ApiError(400, 'Picture dimensions are invalid.');
    }

    return { width, height };
  }

  if (extension === 'webp') return readWebpDimensions(buffer);

  return readJpegDimensions(buffer);
}

function readWebpDimensions(buffer: Buffer): { width: number; height: number } {
  if (
    buffer.length < 30 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new ApiError(
      400,
      'Picture content does not match its file extension.',
    );
  }

  const chunk = buffer.toString('ascii', 12, 16);
  let width = 0;
  let height = 0;

  if (chunk === 'VP8X') {
    width = buffer.readUIntLE(24, 3) + 1;
    height = buffer.readUIntLE(27, 3) + 1;
  } else if (chunk === 'VP8L' && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else if (
    chunk === 'VP8 ' &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else {
    throw new ApiError(400, 'Picture content is not a valid WebP file.');
  }

  if (width === 0 || height === 0) {
    throw new ApiError(400, 'Picture dimensions are invalid.');
  }

  return { width, height };
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } {
  if (
    buffer.length < 4 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer[2] !== 0xff
  ) {
    throw new ApiError(
      400,
      'Picture content does not match its file extension.',
    );
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw new ApiError(400, 'Picture content is not a valid JPEG file.');
    }

    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) break;

      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width === 0 || height === 0) {
        throw new ApiError(400, 'Picture dimensions are invalid.');
      }

      return { width, height };
    }

    offset += segmentLength;
  }

  throw new ApiError(400, 'Picture content does not contain valid dimensions.');
}
