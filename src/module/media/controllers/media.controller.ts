import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentMedia } from '../presenters/media.presenter.js';
import { MediaService } from '../services/media.service.js';
import type {
  BulkDeleteMediaInput,
  MediaListQuery,
  UploadMediaInput,
} from '../schemas/media.schema.js';

export class MediaController {
  constructor(private readonly service = new MediaService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.mediaListQuery as MediaListQuery;
    const media = await this.service.list(query);

    res.status(200).json({ media: media.map(presentMedia) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const media = await this.service.getById(parseIdParam(req.params.mediaId));
    res.status(200).json({ media: presentMedia(media) });
  };

  upload = async (req: Request, res: Response): Promise<void> => {
    const userName = getAuthenticatedUserName(req);
    const input = req.body as UploadMediaInput;
    const media = await this.service.upload(req.file, input.type, userName);

    res.status(201).json({ media: presentMedia(media) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseIdParam(req.params.mediaId));
    res.status(204).end();
  };

  bulkDelete = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as BulkDeleteMediaInput;
    const deletedCount = await this.service.bulkDelete(input.ids);

    res.status(200).json({ deleted_count: deletedCount });
  };
}

function getAuthenticatedUserName(req: Request): string {
  if (!req.authenticatedUser) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return req.authenticatedUser.name;
}
