import { ApiError } from '../../../shared/errors/api-error.js';
import { MediaRepository } from '../../media/repositories/media.repository.js';
import { findContentDefinition } from '../content-definitions.js';
import { ContentRepository } from '../repositories/content.repository.js';
import type {
  ContentListQuery,
  UpsertContentInput,
} from '../schemas/content.schema.js';

export class ContentService {
  constructor(
    private readonly repository = new ContentRepository(),
    private readonly mediaRepository = new MediaRepository(),
  ) {}

  list(query: ContentListQuery) {
    return this.repository.findMany(query);
  }

  async upsertMany(inputs: UpsertContentInput[], userName: string) {
    if (userName.length > 100) {
      throw new ApiError(
        400,
        'Authenticated user name exceeds 100 characters.',
      );
    }

    const sortableCombinations = new Map<
      string,
      { page: string; blockKey: string; blockType: string }
    >();
    const mediaExistence = new Map<number, boolean>();

    for (const [index, input] of inputs.entries()) {
      const definition = findContentDefinition(
        input.page,
        input.block_key,
        input.block_type,
      );

      if (!definition) {
        throw new ApiError(
          400,
          `Item at index ${index}: Content combination is not available.`,
        );
      }

      if (definition.supportsOrder) {
        const identity = JSON.stringify([
          input.page,
          input.block_key,
          input.block_type,
        ]);

        sortableCombinations.set(identity, {
          page: input.page,
          blockKey: input.block_key,
          blockType: input.block_type,
        });
      }

      if (input.media_id !== undefined && input.media_id !== null) {
        let exists = mediaExistence.get(input.media_id);

        if (exists === undefined) {
          exists = Boolean(await this.mediaRepository.findById(input.media_id));
          mediaExistence.set(input.media_id, exists);
        }

        if (!exists) {
          throw new ApiError(
            400,
            `Item at index ${index}: Media item does not exist.`,
          );
        }
      }
    }

    try {
      return await this.repository.replaceMany(
        inputs,
        [...sortableCombinations.values()],
        userName,
      );
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ApiError(400, 'Media item does not exist.');
      }

      throw error;
    }
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
