import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../../../shared/errors/api-error.js';

export type ArticlePhotoFile = Express.Multer.File;

export type PreparedArticlePhoto = {
  temporaryPath: string;
  destinationPath: string;
  publicUrl: string;
};

const publicArticlesDirectory = path.resolve(
  process.cwd(),
  'public',
  'articles',
);

export class ArticlePhotoService {
  async prepare(
    articleId: number,
    file: ArticlePhotoFile,
  ): Promise<PreparedArticlePhoto> {
    validateImageSignature(file);

    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${articleId}${extension}`;
    const destinationPath = path.join(publicArticlesDirectory, filename);
    const temporaryPath = path.join(
      publicArticlesDirectory,
      `.${articleId}.${randomUUID()}.upload`,
    );

    await mkdir(publicArticlesDirectory, { recursive: true });
    try {
      await writeFile(temporaryPath, file.buffer, { flag: 'wx' });
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }

    return {
      temporaryPath,
      destinationPath,
      publicUrl: `/public/articles/${filename}`,
    };
  }

  async activate(photo: PreparedArticlePhoto): Promise<string | null> {
    const backupPath = `${photo.destinationPath}.${randomUUID()}.backup`;
    let hasBackup = false;

    try {
      await rename(photo.destinationPath, backupPath);
      hasBackup = true;
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }

    try {
      await rename(photo.temporaryPath, photo.destinationPath);
    } catch (error) {
      if (hasBackup) {
        await rename(backupPath, photo.destinationPath);
      }

      throw error;
    }

    return hasBackup ? backupPath : null;
  }

  async rollback(
    photo: PreparedArticlePhoto,
    backupPath: string | null,
    isActivated: boolean,
  ): Promise<void> {
    if (isActivated) {
      await rm(photo.destinationPath, { force: true });

      if (backupPath) {
        await rename(backupPath, photo.destinationPath);
      }
    }

    await rm(photo.temporaryPath, { force: true });
  }

  async complete(photo: PreparedArticlePhoto, backupPath: string | null) {
    try {
      await rm(photo.temporaryPath, { force: true });

      if (backupPath) {
        await rm(backupPath, { force: true });
      }
    } catch (error) {
      console.error('Unable to remove a replaced article photo.', error);
    }
  }

  async removeByUrl(url: string | null | undefined): Promise<void> {
    const filePath = this.getManagedFilePath(url);

    if (filePath) {
      await rm(filePath, { force: true });
    }
  }

  async removeAfterCommit(url: string | null | undefined): Promise<void> {
    try {
      await this.removeByUrl(url);
    } catch (error) {
      console.error('Unable to remove an article photo.', error);
    }
  }

  private getManagedFilePath(url: string | null | undefined): string | null {
    const prefix = '/public/articles/';

    if (!url?.startsWith(prefix)) {
      return null;
    }

    const filename = url.slice(prefix.length);

    if (
      !/^\d+\.(?:png|jpe?g|webp)$/i.test(filename) ||
      path.basename(filename) !== filename
    ) {
      return null;
    }

    return path.join(publicArticlesDirectory, filename);
  }
}

function validateImageSignature(file: ArticlePhotoFile): void {
  const extension = path.extname(file.originalname).toLowerCase();
  const isPng =
    extension === '.png' &&
    file.buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg =
    (extension === '.jpg' || extension === '.jpeg') &&
    file.buffer.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const isWebp =
    extension === '.webp' &&
    file.buffer.toString('ascii', 0, 4) === 'RIFF' &&
    file.buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isPng && !isJpeg && !isWebp) {
    throw new ApiError(
      400,
      'Primary photo content does not match its file type.',
    );
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
