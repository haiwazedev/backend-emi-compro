import { ApiError } from '../../../shared/errors/api-error.js';
import { ActivityLogService } from '../../activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { findContentDefinition } from '../site-content-definitions.js';
import {
  DEFAULT_LANGUAGE_ID,
  LanguageService,
} from '../../language/services/language.service.js';
import { MediaRepository } from '../../media/repositories/media.repository.js';
import { SiteContentRepository } from '../repositories/site-content.repository.js';
import type {
  SaveSiteContentsInput,
  SiteContentQuery,
} from '../schemas/site-content.schema.js';

export class SiteContentService {
  constructor(
    private readonly repository = new SiteContentRepository(),
    private readonly languageService = new LanguageService(),
    private readonly mediaRepository = new MediaRepository(),
    private readonly activityLogService = new ActivityLogService(),
  ) {}

  async list(query: SiteContentQuery) {
    const language = await this.languageService.requireActive(
      query.language_id ?? DEFAULT_LANGUAGE_ID,
    );
    const items = await this.repository.findItems(query.page, language.id);

    return { languageId: language.id, items };
  }

  async save(input: SaveSiteContentsInput, user: AuthenticatedUser) {
    if (user.name.length > 100) {
      throw new ApiError(
        400,
        'Authenticated user name exceeds 100 characters.',
      );
    }

    const language = await this.languageService.requireActive(
      input.language_id,
    );

    // Bahasa Indonesia content must exist somewhere before other languages.
    if (
      language.id !== DEFAULT_LANGUAGE_ID &&
      !(await this.repository.hasItemInLanguage(DEFAULT_LANGUAGE_ID))
    ) {
      throw new ApiError(
        400,
        'Bahasa Indonesia is required before adding another language.',
      );
    }

    await this.requireMediaPaths(input);

    const items = await this.repository.save(
      language.id,
      input.items.map((item) => ({
        ...item,
        // The schema already rejected combinations missing from the allowlist.
        isSortable: Boolean(
          findContentDefinition(item.page, item.block_key, item.block_type)
            ?.supportsOrder,
        ),
      })),
      user.name,
    );

    const pages = [...new Set(input.items.map((item) => item.page))];
    await this.activityLogService.log(
      user,
      'memperbarui konten halaman',
      pages.join(', '),
    );
    return { languageId: language.id, items };
  }

  // Paths are stored without an FK, so check each one came from the media library.
  private async requireMediaPaths(input: SaveSiteContentsInput) {
    const paths = new Set(
      input.items.flatMap(({ data }) =>
        typeof data.media_filepath === 'string' ? [data.media_filepath] : [],
      ),
    );
    if (paths.size === 0) return;

    const existing = new Set(
      (await this.mediaRepository.findManyByPaths([...paths])).map(
        (media) => media.path,
      ),
    );
    const index = input.items.findIndex(
      ({ data }) =>
        typeof data.media_filepath === 'string' &&
        !existing.has(data.media_filepath),
    );

    if (index >= 0) {
      throw new ApiError(
        400,
        `Item at index ${index}: Media item does not exist.`,
      );
    }
  }
}
