import { z } from 'zod';
import { languageIdSchema } from '../../../shared/schemas/common.schema.js';
import {
  findContentDefinition,
  type ContentDefinition,
} from '../site-content-definitions.js';

const contentIdentifier = z.string().trim().min(1).max(100);

export const siteContentQuerySchema = z
  .object({
    page: contentIdentifier,
    language_id: languageIdSchema.optional(),
  })
  .strict();

const siteContentItemSchema = z
  .object({
    page: contentIdentifier,
    block_key: contentIdentifier,
    block_type: contentIdentifier,
    sort_order: z.number().int().positive().optional(),
    data: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((input, context) => {
    const definition = refineContentDefinition(input, context);

    if (!definition) {
      return;
    }

    const { media_filepath: mediaFilepath, ...fields } = input.data;

    if (definition.supportsMedia) {
      const isValidPath =
        mediaFilepath === undefined ||
        mediaFilepath === null ||
        (typeof mediaFilepath === 'string' && mediaFilepath.length <= 255);

      if (!isValidPath) {
        context.addIssue({
          code: 'custom',
          message:
            'Data field "media_filepath" must be a string up to 255 characters or null.',
          path: ['data', 'media_filepath'],
        });
      }
      validateData(fields, definition.dataFields, context);
    } else {
      validateData(input.data, definition.dataFields, context);
    }
  });

export const saveSiteContentsBodySchema = z
  .object({
    language_id: languageIdSchema,
    items: z
      .array(siteContentItemSchema)
      .min(1, 'At least one content item is required.')
      .superRefine(refineContentItems),
  })
  .strict();

export type SiteContentQuery = z.infer<typeof siteContentQuerySchema>;
export type SaveSiteContentsInput = z.infer<typeof saveSiteContentsBodySchema>;
export type SiteContentItemInput = SaveSiteContentsInput['items'][number];

type ContentItemIdentity = {
  page: string;
  block_key: string;
  block_type: string;
  sort_order?: number;
};

// Checks the combination is allowlisted and its sort_order fits the definition.
function refineContentDefinition(
  input: ContentItemIdentity,
  context: z.RefinementCtx,
): ContentDefinition | undefined {
  const definition = findContentDefinition(
    input.page,
    input.block_key,
    input.block_type,
  );

  if (!definition) {
    context.addIssue({
      code: 'custom',
      message: 'Content combination is not available.',
      path: ['block_type'],
    });
    return undefined;
  }

  if (definition.supportsOrder && input.sort_order === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Sort order is required for this content combination.',
      path: ['sort_order'],
    });
  }

  if (
    !definition.supportsOrder &&
    input.sort_order !== undefined &&
    input.sort_order !== 1
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Sort order must be 1 for this content combination.',
      path: ['sort_order'],
    });
  }

  return definition;
}

// Rejects duplicate items and non-consecutive sort_order within a block.
function refineContentItems(
  inputs: ContentItemIdentity[],
  context: z.RefinementCtx,
): void {
  const seenKeys = new Map<string, number>();
  const sortableGroups = new Map<
    string,
    { index: number; sortOrder: number }[]
  >();

  inputs.forEach((input, index) => {
    const definition = findContentDefinition(
      input.page,
      input.block_key,
      input.block_type,
    );

    if (!definition) {
      return;
    }

    const sortOrder = input.sort_order ?? 1;
    const identity = JSON.stringify([
      input.page,
      input.block_key,
      input.block_type,
      sortOrder,
    ]);
    const firstIndex = seenKeys.get(identity);

    if (firstIndex !== undefined) {
      context.addIssue({
        code: 'custom',
        message: `Content item duplicates item at index ${firstIndex}.`,
        path: [index],
      });
    } else {
      seenKeys.set(identity, index);
    }

    if (definition.supportsOrder && input.sort_order !== undefined) {
      const groupIdentity = JSON.stringify([
        input.page,
        input.block_key,
        input.block_type,
      ]);
      const entries = sortableGroups.get(groupIdentity) ?? [];

      entries.push({ index, sortOrder: input.sort_order });
      sortableGroups.set(groupIdentity, entries);
    }
  });

  for (const entries of sortableGroups.values()) {
    const orderedEntries = [...entries].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    const firstInvalidEntry = orderedEntries.find(
      (entry, index) => entry.sortOrder !== index + 1,
    );

    if (firstInvalidEntry) {
      context.addIssue({
        code: 'custom',
        message:
          'Sortable content sort_order values must start at 1 and be consecutive.',
        path: [firstInvalidEntry.index, 'sort_order'],
      });
    }
  }
}

function validateData(
  data: unknown,
  fields: readonly string[],
  context: z.RefinementCtx,
): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    context.addIssue({
      code: 'custom',
      message: 'Data must be an object containing the required fields.',
      path: ['data'],
    });
    return;
  }

  const record = data as Record<string, unknown>;

  for (const field of fields) {
    if (!(field in record)) {
      context.addIssue({
        code: 'custom',
        message: 'Data field "' + field + '" is required.',
        path: ['data', field],
      });
    } else if (typeof record[field] !== 'string') {
      context.addIssue({
        code: 'custom',
        message: 'Data field "' + field + '" must be a string.',
        path: ['data', field],
      });
    }
  }

  for (const field of Object.keys(record)) {
    if (!fields.includes(field)) {
      context.addIssue({
        code: 'custom',
        message: 'Data field "' + field + '" is not supported.',
        path: ['data', field],
      });
    }
  }
}
