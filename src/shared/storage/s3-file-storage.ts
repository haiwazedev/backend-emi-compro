import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { ApiError } from '../errors/api-error.js';

const DEFAULT_REGION = 'us-east-1';
const STORAGE_UNAVAILABLE_MESSAGE = 'File storage is unavailable.';

export class S3ObjectNotFoundError extends Error {
  constructor() {
    super('File was not found.');
    this.name = 'S3ObjectNotFoundError';
  }
}

export type S3FileReplacement = {
  commitAfterTransaction(): Promise<void>;
  rollbackAfterFailure(): Promise<void>;
};

type S3Configuration = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
};

type SavedObject = {
  buffer: Buffer;
  contentType: string;
};

export class S3FileStorage {
  private client: S3Client | undefined;
  private bucket: string | undefined;

  async store(
    publicPath: string,
    buffer: Buffer,
    contentType: string,
    conflictMessage: string,
  ): Promise<void> {
    const { client, bucket } = this.getClient();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: publicPathToObjectKey(publicPath),
          Body: buffer,
          ContentType: contentType,
          IfNoneMatch: '*',
        }),
      );
    } catch (error) {
      if (isConditionalConflict(error)) {
        throw new ApiError(409, conflictMessage);
      }

      throw mapStorageError(error);
    }
  }

  async replace(
    publicPath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<S3FileReplacement> {
    const previous = await this.getOptionalObject(publicPath);

    try {
      await this.putObject(publicPath, buffer, contentType);
    } catch (error) {
      await this.restoreObject(publicPath, previous, contentType).catch(
        (rollbackError: unknown) => {
          console.error(
            'Unable to restore an S3 file after a failed upload.',
            rollbackError,
          );
        },
      );
      throw error;
    }

    return {
      commitAfterTransaction: async () => {},
      rollbackAfterFailure: () =>
        this.restoreObject(publicPath, previous, contentType),
    };
  }

  async remove(publicPath: string): Promise<void> {
    const { client, bucket } = this.getClient();

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: publicPathToObjectKey(publicPath),
        }),
      );
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  async get(
    publicPath: string,
    range?: string,
  ): Promise<GetObjectCommandOutput> {
    const { client, bucket } = this.getClient();

    try {
      return await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: publicPathToObjectKey(publicPath),
          Range: range,
        }),
      );
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  async head(publicPath: string) {
    const { client, bucket } = this.getClient();

    try {
      return await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: publicPathToObjectKey(publicPath),
        }),
      );
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  private async putObject(
    publicPath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    const { client, bucket } = this.getClient();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: publicPathToObjectKey(publicPath),
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  private async getOptionalObject(
    publicPath: string,
  ): Promise<SavedObject | undefined> {
    let result: GetObjectCommandOutput;

    try {
      result = await this.get(publicPath);
    } catch (error) {
      if (error instanceof S3ObjectNotFoundError) return undefined;
      throw error;
    }

    if (!result.Body) {
      return {
        buffer: Buffer.alloc(0),
        contentType: result.ContentType ?? contentTypeForPublicPath(publicPath),
      };
    }

    const chunks: Buffer[] = [];
    try {
      for await (const chunk of result.Body as Readable) {
        chunks.push(Buffer.from(chunk));
      }
    } catch (error) {
      throw mapStorageError(error);
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: result.ContentType ?? contentTypeForPublicPath(publicPath),
    };
  }

  private async restoreObject(
    publicPath: string,
    previous: SavedObject | undefined,
    contentType: string,
  ): Promise<void> {
    if (!previous) {
      await this.remove(publicPath);
      return;
    }

    await this.putObject(
      publicPath,
      previous.buffer,
      previous.contentType || contentType,
    );
  }

  private getClient(): { client: S3Client; bucket: string } {
    if (this.client && this.bucket) {
      return { client: this.client, bucket: this.bucket };
    }

    const configuration = readS3Configuration();
    this.client = new S3Client({
      endpoint: configuration.endpoint,
      region: configuration.region,
      credentials: {
        accessKeyId: configuration.accessKey,
        secretAccessKey: configuration.secretKey,
      },
      forcePathStyle: true,
    });
    this.bucket = configuration.bucket;

    return { client: this.client, bucket: configuration.bucket };
  }
}

export const s3FileStorage = new S3FileStorage();

export function contentTypeForPublicPath(publicPath: string): string {
  const extension = publicPath.split('.').at(-1)?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

export function publicPathToObjectKey(publicPath: string): string {
  if (!publicPath.startsWith('/public/')) {
    throw new ApiError(400, 'Public file path is invalid.');
  }

  const encodedSegments = publicPath.slice('/public/'.length).split('/');
  const decodedSegments = encodedSegments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      throw new ApiError(400, 'Public file path is invalid.');
    }
  });

  if (
    decodedSegments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('/') ||
        segment.includes('\\') ||
        segment.includes('\0'),
    )
  ) {
    throw new ApiError(400, 'Public file path is invalid.');
  }

  const key = decodedSegments.join('/');
  if (!isManagedObjectKey(key)) {
    throw new ApiError(400, 'Public file path is invalid.');
  }

  return key;
}

export function objectKeyToPublicPath(key: string): string | null {
  if (!isManagedObjectKey(key)) return null;

  return (
    '/public/' +
    key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
  );
}

function isManagedObjectKey(key: string): boolean {
  const segments = key.split('/');
  if (segments.length === 1) {
    return /^site-logo-[^/]+\.(png|jpe?g|webp|svg)$/i.test(key);
  }

  if (segments.length !== 2 || !segments[1]) return false;

  switch (segments[0]) {
    case 'media':
      return /^[^/]+\.(png|jpe?g|pdf)$/i.test(segments[1]);
    case 'document_commitment':
      return /^[^/]+\.pdf$/i.test(segments[1]);
    case 'board_member':
      return /^\d+\.(png|jpe?g)$/i.test(segments[1]);
    case 'clients':
      return /^[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(segments[1]);
    case 'site-social-medias':
      return /^site-social-media-[^/]+\.svg$/i.test(segments[1]);
    default:
      return false;
  }
}

function readS3Configuration(): S3Configuration {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKey = process.env.S3_ACCESS_KEY?.trim();
  const secretKey = process.env.S3_SECRET_KEY?.trim();

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new ApiError(503, STORAGE_UNAVAILABLE_MESSAGE);
  }

  try {
    const parsedEndpoint = new URL(endpoint);
    if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) {
      throw new Error('Unsupported S3 endpoint protocol.');
    }
  } catch {
    throw new ApiError(503, STORAGE_UNAVAILABLE_MESSAGE);
  }

  return {
    endpoint,
    bucket,
    region: process.env.S3_REGION?.trim() || DEFAULT_REGION,
    accessKey,
    secretKey,
  };
}

function mapStorageError(error: unknown): Error {
  if (isObjectNotFound(error)) return new S3ObjectNotFoundError();

  if (isConditionalConflict(error)) {
    return new ApiError(409, 'A file with this filename already exists.');
  }

  if (getStatusCode(error) === 416) {
    return new ApiError(416, 'Requested file range is not satisfiable.');
  }

  return new ApiError(503, STORAGE_UNAVAILABLE_MESSAGE);
}

function isObjectNotFound(error: unknown): boolean {
  const name = getErrorName(error);
  if (name === 'NoSuchBucket') return false;

  return (
    name === 'NoSuchKey' || name === 'NotFound' || getStatusCode(error) === 404
  );
}

function isConditionalConflict(error: unknown): boolean {
  const name = getErrorName(error);

  return (
    name === 'PreconditionFailed' ||
    name === 'ConditionalRequestConflict' ||
    getStatusCode(error) === 412
  );
}

function getErrorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return undefined;
  }

  return typeof error.name === 'string' ? error.name : undefined;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('$metadata' in error)) {
    return undefined;
  }

  const metadata = error.$metadata;
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('httpStatusCode' in metadata)
  ) {
    return undefined;
  }

  return typeof metadata.httpStatusCode === 'number'
    ? metadata.httpStatusCode
    : undefined;
}
