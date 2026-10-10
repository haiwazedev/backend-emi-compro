import { z } from 'zod';
import { findContentDefinition } from '../content-definitions.js';

const contentIdentifier = z.string().trim().min(1).max(100);

export const contentListQuerySchema = z
  .object({
    page: contentIdentifier.optional(),
    block_key: contentIdentifier.optional(),
    block_type: contentIdentifier.optional(),
  })
  .strict();

export const upsertContentItemSchema = z
  .object({
    page: contentIdentifier,
    block_key: contentIdentifier,
    block_type: contentIdentifier,
    sort_order: z.number().int().positive().optional(),
    data: z.unknown().optional(),
    media_id: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .superRefine((input, context) => {
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
      return;
    }

    if (definition.supportsOrder && input.sort_order === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Sort order is required for this content combination.',
        path: ['sort_order'],
      });
    }

    if (!definition.supportsOrder && input.sort_order !== undefined) {
      if (input.sort_order !== 1) {
        context.addIssue({
          code: 'custom',
          message: 'Sort order must be 1 for this content combination.',
          path: ['sort_order'],
        });
      }
    }

    if (definition.dataFields.length === 0) {
      if (input.data !== undefined && input.data !== null) {
        context.addIssue({
          code: 'custom',
          message: 'This content combination does not accept data fields.',
          path: ['data'],
        });
      }
    } else {
      validateData(input.data, definition.dataFields, context);
    }

    if (
      input.media_id !== undefined &&
      input.media_id !== null &&
      !definition.supportsMedia
    ) {
      context.addIssue({
        code: 'custom',
        message: 'This content combination does not support media.',
        path: ['media_id'],
      });
    }
  });

export const upsertContentsBodySchema = z
  .array(upsertContentItemSchema)
  .min(1, 'At least one content item is required.')
  .superRefine((inputs, context) => {
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
  });

export type ContentListQuery = z.infer<typeof contentListQuerySchema>;
export type UpsertContentInput = z.infer<typeof upsertContentItemSchema>;

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
