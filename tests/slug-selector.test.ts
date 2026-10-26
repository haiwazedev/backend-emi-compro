import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AuthenticatedUser } from '../src/module/auth/authenticated-user.js';
import {
  createDocumentCommitmentCategoryBodySchema,
  updateDocumentCommitmentCategoryBodySchema,
} from '../src/module/document_commitment/schemas/document-commitment-category.schema.js';
import { documentCommitmentListQuerySchema } from '../src/module/document_commitment/schemas/document-commitment.schema.js';
import { articleListQuerySchema } from '../src/module/article/schemas/article.schema.js';
import {
  createDivisionBodySchema,
  updateDivisionBodySchema,
} from '../src/module/division/schemas/division.schema.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const [
  { buildArticleWhere },
  { buildDocumentCommitmentWhere },
  { DocumentCommitmentCategoryService },
  { openApiDocument },
] = await Promise.all([
  import('../src/module/article/repositories/article.repository.js'),
  import('../src/module/document_commitment/repositories/document-commitment.repository.js'),
  import('../src/module/document_commitment/services/document-commitment-category.service.js'),
  import('../src/module/documentation/openapi.js'),
]);
const { DivisionService } =
  await import('../src/module/division/services/division.service.js');

test('article list accepts a category slug and keeps content filters', () => {
  const query = articleListQuerySchema.parse({
    article_category_slug: 'company-news',
    language_id: 'en',
    page: '2',
    search: 'energy',
  });

  const where = buildArticleWhere(query, false);

  assert.deepEqual(where.articleCategory, { slug: 'company-news' });
  assert.equal(where.articleCategoryId, undefined);
  assert.deepEqual(where.contents, {
    some: {
      languageId: 'en',
      title: { contains: 'energy', mode: 'insensitive' },
      status: 'PUBLISHED',
      language: { isActive: true },
    },
  });
});

test('article list preserves the numeric category filter', () => {
  const query = articleListQuerySchema.parse({ article_category_id: '3' });

  assert.deepEqual(buildArticleWhere(query, true).articleCategoryId, 3);
});

test('article list rejects simultaneous ID and slug filters', () => {
  const result = articleListQuerySchema.safeParse({
    article_category_id: '3',
    article_category_slug: 'company-news',
  });

  assert.equal(result.success, false);
});

test('commitment list filters by category slug and retains status', () => {
  const query = documentCommitmentListQuerySchema.parse({
    document_commitment_category_slug: 'board-decisions',
    status: 'PUBLISHED',
  });
  const where = buildDocumentCommitmentWhere(query, true);

  assert.deepEqual(where.documentCommitmentCategory, {
    slug: 'board-decisions',
  });
  assert.equal(where.documentCommitmentCategoryId, undefined);
  assert.equal(where.status, 'PUBLISHED');
});

test('commitment list rejects simultaneous ID and slug filters', () => {
  const result = documentCommitmentListQuerySchema.safeParse({
    document_commitment_category_id: '2',
    document_commitment_category_slug: 'board-decisions',
  });

  assert.equal(result.success, false);
});

test('commitment category creates require an explicit slug', () => {
  assert.equal(
    createDocumentCommitmentCategoryBodySchema.safeParse({
      name: 'Board Decisions',
    }).success,
    false,
  );
  assert.equal(
    createDocumentCommitmentCategoryBodySchema.safeParse({
      name: 'Board Decisions',
      slug: 'board-decisions',
    }).success,
    true,
  );
  assert.equal(
    updateDocumentCommitmentCategoryBodySchema.safeParse({
      name: 'Updated Board Decisions',
    }).success,
    true,
  );
});

test('duplicate commitment category slugs return a conflict', async () => {
  const repository = {
    findBySlug: async () => ({ id: 7 }),
  } as unknown as DocumentCommitmentCategoryRepository;
  const service = new DocumentCommitmentCategoryService(
    repository,
    {} as never,
    { log: async () => undefined } as never,
  );
  const user: AuthenticatedUser = {
    id: 1,
    name: 'Test Admin',
    permissions: ['write'],
  };

  await assert.rejects(
    service.create({ name: 'Board Decisions', slug: 'board-decisions' }, user),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 409,
  );
});

test('updating to a duplicate commitment category slug returns a conflict', async () => {
  const repository = {
    findById: async () => ({ id: 1, name: 'Existing', slug: 'existing' }),
    findBySlug: async () => ({ id: 2, name: 'Other', slug: 'other' }),
  } as never;
  const service = new DocumentCommitmentCategoryService(
    repository,
    {} as never,
    { log: async () => undefined } as never,
  );
  const user: AuthenticatedUser = {
    id: 1,
    name: 'Test Admin',
    permissions: ['write'],
  };

  await assert.rejects(
    service.update(1, { slug: 'other' }, user),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 409,
  );
});

test('division creates require a localized slug', () => {
  const missingSlug = createDivisionBodySchema.safeParse({
    language_id: 'id',
    name: 'Layanan Pelanggan',
    abbr: 'LP',
  });
  const withSlug = createDivisionBodySchema.safeParse({
    language_id: 'id',
    name: 'Layanan Pelanggan',
    slug: 'layanan-pelanggan',
    abbr: 'LP',
  });

  assert.equal(missingSlug.success, false);
  assert.equal(withSlug.success, true);
  assert.equal(
    updateDivisionBodySchema.safeParse({
      language_id: 'id',
      name: 'Updated service name',
    }).success,
    true,
  );
});

test('OpenAPI create request schemas mark selector slugs as required', () => {
  assert.ok(
    getRequiredBodyFields('/document_commitment_categories', 'post').includes(
      'slug',
    ),
  );
  assert.ok(getRequiredBodyFields('/divisions', 'post').includes('slug'));
});

test('division create returns a conflict for a duplicate slug in its language', async () => {
  const service = new DivisionService(
    {
      create: async () => {
        throw { code: 'P2002' };
      },
    } as never,
    { requireActive: async () => undefined } as never,
    { log: async () => undefined } as never,
  );
  const user: AuthenticatedUser = {
    id: 1,
    name: 'Test Admin',
    permissions: ['write'],
  };

  await assert.rejects(
    service.create(
      {
        language_id: 'id',
        name: 'Layanan Pelanggan',
        slug: 'layanan-pelanggan',
        abbr: 'LP',
      },
      user,
    ),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 409,
  );
});

test('adding a division translation requires a localized slug', async () => {
  const service = new DivisionService(
    {
      findById: async () => ({
        id: 1,
        contents: [{ languageId: 'id' }],
      }),
      update: async () => {
        throw new Error('Repository update should not be called.');
      },
    } as never,
    { requireActive: async () => undefined } as never,
    { log: async () => undefined } as never,
  );
  const user: AuthenticatedUser = {
    id: 1,
    name: 'Test Admin',
    permissions: ['write'],
  };

  await assert.rejects(
    service.update(
      1,
      { language_id: 'en', name: 'Customer Service', abbr: 'CS' },
      user,
    ),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 400,
  );
});

test('division translation updates return a conflict for a duplicate localized slug', async () => {
  const service = new DivisionService(
    {
      findById: async () => ({
        id: 1,
        contents: [
          {
            languageId: 'id',
            name: 'Layanan Pelanggan',
            slug: 'layanan-pelanggan',
            abbr: 'LP',
          },
        ],
      }),
      update: async () => {
        throw { code: 'P2002' };
      },
    } as never,
    { requireActive: async () => undefined } as never,
    { log: async () => undefined } as never,
  );
  const user: AuthenticatedUser = {
    id: 1,
    name: 'Test Admin',
    permissions: ['write'],
  };

  await assert.rejects(
    service.update(1, { language_id: 'id', slug: 'another-division' }, user),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 409,
  );
});

function getRequiredBodyFields(path: string, method: string): string[] {
  const paths = openApiDocument.paths as unknown as Record<
    string,
    Record<
      string,
      {
        requestBody?: {
          content?: {
            'application/json'?: { schema?: { required?: string[] } };
          };
        };
      }
    >
  >;
  const required =
    paths[path]?.[method]?.requestBody?.content?.['application/json']?.schema
      ?.required;
  assert.ok(
    required,
    `${method.toUpperCase()} ${path} should define required fields.`,
  );
  return required;
}
