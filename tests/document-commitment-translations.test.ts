import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { AuthenticatedUser } from '../src/module/auth/authenticated-user.js';
import { ApiError } from '../src/shared/errors/api-error.js';
import { presentDocumentCommitmentListItem } from '../src/module/document_commitment/presenters/document-commitment.presenter.js';
import { documentCommitmentListQuerySchema } from '../src/module/document_commitment/schemas/document-commitment.schema.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const [{ DocumentCommitmentService }, { presentSearchResult }] =
  await Promise.all([
    import('../src/module/document_commitment/services/document-commitment.service.js'),
    import('../src/module/search/presenters/search.presenter.js'),
  ]);

const user: AuthenticatedUser = {
  id: 1,
  name: 'Test Admin',
  permissions: ['write'],
};

test('document creation requires Indonesian content before another language', async () => {
  let created = false;
  const service = new DocumentCommitmentService(
    {
      create: async () => {
        created = true;
        throw new Error('Document should not be created.');
      },
    } as never,
    { findById: async () => ({ id: 2 }) } as never,
    {
      describeUpload: () => ({
        filePath: '/file.pdf',
        filename: 'file.pdf',
        size: 1,
      }),
    } as never,
    { log: async () => undefined } as never,
    { requireActive: async () => undefined } as never,
  );

  await assert.rejects(
    service.create(
      {
        document_commitment_category_id: 2,
        language_id: 'en',
        title: 'Annual report',
      },
      { buffer: Buffer.from('pdf') } as Express.Multer.File,
      user,
    ),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 400,
  );

  assert.equal(created, false);
});

test('document creation rejects an inactive language', async () => {
  let checkedLanguageId: string | undefined;
  let created = false;
  const service = new DocumentCommitmentService(
    {
      create: async () => {
        created = true;
        throw new Error('Document should not be created.');
      },
    } as never,
    { findById: async () => ({ id: 2 }) } as never,
    {
      describeUpload: () => ({
        filePath: '/file.pdf',
        filename: 'file.pdf',
        size: 1,
      }),
    } as never,
    { log: async () => undefined } as never,
    {
      requireActive: async (languageId: string) => {
        checkedLanguageId = languageId;
        throw new ApiError(400, 'Language does not exist or is inactive.');
      },
    } as never,
  );

  await assert.rejects(
    service.create(
      {
        document_commitment_category_id: 2,
        language_id: 'id',
        title: 'Annual report',
      },
      { buffer: Buffer.from('pdf') } as Express.Multer.File,
      user,
    ),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 400,
  );

  assert.equal(checkedLanguageId, 'id');
  assert.equal(created, false);
});

test('document list presenter selects title and category content by language', () => {
  const document = {
    id: 21,
    documentCommitmentCategoryId: 2,
    contents: [
      { languageId: 'id', title: 'Laporan Tahunan' },
      { languageId: 'en', title: 'Annual Report' },
    ],
    filePath: '/public/document_commitment/report.pdf',
    filename: 'report.pdf',
    size: 40,
    status: 'PUBLISHED' as const,
    uploadedAt: new Date('2026-10-11T10:30:00.000Z'),
    uploadedBy: 'Ari Putra',
    updatedAt: null,
    updatedBy: null,
    documentCommitmentCategory: {
      id: 2,
      contents: [
        {
          languageId: 'id',
          name: 'Laporan',
          slug: 'laporan',
          description: null,
        },
        {
          languageId: 'en',
          name: 'Reports',
          slug: 'reports',
          description: 'Company reports',
        },
      ],
    },
  };

  const result = presentDocumentCommitmentListItem(document, 'en');

  assert.equal(result.language_id, 'en');
  assert.equal(result.title, 'Annual Report');
  assert.deepEqual(result.document_commitment_category, {
    id: 2,
    language_id: 'en',
    name: 'Reports',
    slug: 'reports',
    description: 'Company reports',
  });

  const defaultLanguageResult = presentDocumentCommitmentListItem(document);
  assert.equal(defaultLanguageResult.language_id, 'id');
  assert.equal(defaultLanguageResult.title, 'Laporan Tahunan');
});

test('document search includes the language of its matching title', () => {
  const result = presentSearchResult({
    articles: [],
    documentCommitments: [
      {
        documentCommitmentId: 2,
        languageId: 'en',
        title: 'Annual Report',
      },
    ],
    divisions: [],
    services: [],
    boardMembers: [],
    faqs: [],
    users: [],
    inboxes: [],
  } as never);

  assert.deepEqual(result.document_commitments, [
    { id: 2, language_id: 'en', title: 'Annual Report' },
  ]);
});

test('document pagination counts localized results from the same query', async () => {
  let findQuery: unknown;
  let countQuery: unknown;
  const service = new DocumentCommitmentService({
    findMany: async (query: unknown) => {
      findQuery = query;
      return [];
    },
    count: async (query: unknown) => {
      countQuery = query;
      return 11;
    },
  } as never);
  const query = documentCommitmentListQuerySchema.parse({
    page: '2',
    limit: '10',
    language_id: 'en',
    status: 'PUBLISHED',
  });

  const result = await service.list(query, true);

  assert.equal(findQuery, query);
  assert.equal(countQuery, query);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 10,
    totalItems: 11,
    totalPages: 2,
  });
});

test('migration backfills existing document and category text into Indonesian', () => {
  const migration = readFileSync(
    new URL(
      '../prisma/migrations/20261026150000_document_commitment_contents/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    migration,
    /SELECT "id", 'id', "name", "slug"\s+FROM "document_commitment_categories"/,
  );
  assert.match(
    migration,
    /SELECT "id", 'id', "title"\s+FROM "document_commitments"/,
  );
  assert.match(migration, /DROP COLUMN "name",\s+DROP COLUMN "slug"/);
  assert.match(
    migration,
    /ALTER TABLE "document_commitments"\s+DROP COLUMN "title"/,
  );
});
