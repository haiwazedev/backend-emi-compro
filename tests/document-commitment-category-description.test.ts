import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDocumentCommitmentCategoryBodySchema,
  updateDocumentCommitmentCategoryBodySchema,
} from '../src/module/document_commitment/schemas/document-commitment-category.schema.js';
import {
  presentDocumentCommitmentCategory,
  presentDocumentCommitmentCategoryListItem,
} from '../src/module/document_commitment/presenters/document-commitment-category.presenter.js';
import {
  presentDocumentCommitment,
  presentDocumentCommitmentListItem,
} from '../src/module/document_commitment/presenters/document-commitment.presenter.js';
import type { AuthenticatedUser } from '../src/module/auth/authenticated-user.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
const { DocumentCommitmentCategoryService } =
  await import('../src/module/document_commitment/services/document-commitment-category.service.js');
const { DocumentCommitmentCategoryRepository } =
  await import('../src/module/document_commitment/repositories/document-commitment-category.repository.js');
const { prisma } = await import('../src/shared/db/prisma.js');

const user: AuthenticatedUser = {
  id: 1,
  name: 'Admin',
  permissions: ['write'],
};
const category = {
  id: 2,
  contents: [
    { languageId: 'id', name: 'Laporan', slug: 'laporan', description: null },
    {
      languageId: 'en',
      name: 'Reports',
      slug: 'reports',
      description: 'Company reports',
    },
  ],
};

function createService() {
  const writes: unknown[] = [];
  const service = new DocumentCommitmentCategoryService(
    {
      findById: async () => structuredClone(category),
      findBySlug: async () => null,
      create: async (content: unknown) => {
        writes.push(content);
        return category;
      },
      updateWithContent: async (_id: number, content: unknown) => {
        writes.push(content);
        return category;
      },
    } as never,
    {} as never,
    { log: async () => undefined } as never,
    { requireActive: async () => undefined } as never,
  );
  return { service, writes };
}

test('category creation accepts optional descriptions and normalizes blank text', async () => {
  for (const description of [
    undefined,
    null,
    '',
    ' \n ',
    ' Company reports ',
  ]) {
    const { service, writes } = createService();
    const input = createDocumentCommitmentCategoryBodySchema.parse({
      language_id: 'id',
      name: 'Laporan',
      slug: 'laporan',
      description,
    });
    await service.create(input, user);
    const expected =
      typeof description === 'string' && !description.trim()
        ? null
        : description;
    assert.deepEqual(writes, [
      {
        languageId: 'id',
        name: 'Laporan',
        slug: 'laporan',
        description: expected,
      },
    ]);
  }
});

test('description-only updates require language_id and reject non-text values', () => {
  for (const description of ['Reports', null, '']) {
    assert.equal(
      updateDocumentCommitmentCategoryBodySchema.safeParse({ description })
        .success,
      false,
    );
    assert.equal(
      updateDocumentCommitmentCategoryBodySchema.safeParse({
        language_id: 'en',
        description,
      }).success,
      true,
    );
  }
  for (const description of [1, {}, []]) {
    assert.equal(
      createDocumentCommitmentCategoryBodySchema.safeParse({
        language_id: 'id',
        name: 'Reports',
        slug: 'reports',
        description,
      }).success,
      false,
    );
  }
  assert.equal(
    updateDocumentCommitmentCategoryBodySchema.safeParse({ language_id: 'id' })
      .success,
    false,
  );
});

test('description updates target only the requested language and preserve omitted fields', async () => {
  const { service, writes } = createService();
  for (const description of ['Updated reports', null, ' \n ']) {
    await service.update(
      2,
      updateDocumentCommitmentCategoryBodySchema.parse({
        language_id: 'en',
        description,
      }),
      user,
    );
  }
  await service.update(2, { language_id: 'en', name: 'Updated name' }, user);
  assert.deepEqual(writes, [
    { languageId: 'en', description: 'Updated reports' },
    { languageId: 'en', description: null },
    { languageId: 'en', description: null },
    { languageId: 'en', name: 'Updated name' },
  ]);
});

test('a new category translation still requires name and slug', async () => {
  const { service, writes } = createService();
  for (const fields of [
    { description: 'Reports' },
    { name: 'Reports', description: null },
    { slug: 'reports', description: 'Reports' },
  ]) {
    await assert.rejects(
      service.update(2, { language_id: 'fr', ...fields }, user),
      /name and slug are required/,
    );
  }
  assert.deepEqual(writes, []);
  await service.update(
    2,
    { language_id: 'fr', name: 'Rapports', slug: 'rapports' },
    user,
  );
  assert.deepEqual(writes, [
    { languageId: 'fr', name: 'Rapports', slug: 'rapports' },
  ]);
});

test('repository upsert preserves omitted descriptions and scopes changes to one language', async (t) => {
  const calls: unknown[] = [];
  const originalUpdate = prisma.documentCommitmentCategory.update;
  prisma.documentCommitmentCategory.update = (async (args: unknown) => {
    calls.push(args);
    return category;
  }) as typeof originalUpdate;
  t.after(() => {
    prisma.documentCommitmentCategory.update = originalUpdate;
  });
  const repository = new DocumentCommitmentCategoryRepository();
  await repository.updateWithContent(2, {
    languageId: 'en',
    name: 'Reports',
    slug: 'reports',
  });
  await repository.updateWithContent(2, {
    languageId: 'en',
    description: null,
  });
  await repository.updateWithContent(2, {
    languageId: 'en',
    description: 'Updated',
  });
  const upserts = calls.map(
    (call) =>
      (
        call as {
          data: {
            contents: {
              upsert: {
                where: unknown;
                create: { description: unknown };
                update: unknown;
              };
            };
          };
        }
      ).data.contents.upsert,
  );
  assert.deepEqual(upserts[0]?.update, { name: 'Reports', slug: 'reports' });
  assert.equal(upserts[0]?.create.description, null);
  assert.deepEqual(upserts[1]?.update, { description: null });
  assert.deepEqual(upserts[2]?.update, { description: 'Updated' });
  for (const upsert of upserts)
    assert.deepEqual(upsert.where, {
      documentCommitmentCategoryId_languageId: {
        documentCommitmentCategoryId: 2,
        languageId: 'en',
      },
    });
});

test('category and embedded document responses expose translated descriptions', () => {
  const document = {
    id: 1,
    documentCommitmentCategoryId: 2,
    contents: [{ languageId: 'en', title: 'Annual report' }],
    filePath: '/report.pdf',
    filename: 'report.pdf',
    size: 1,
    status: 'PUBLISHED' as const,
    uploadedAt: new Date(),
    uploadedBy: 'Admin',
    updatedAt: null,
    updatedBy: null,
    documentCommitmentCategory: category,
  };
  assert.deepEqual(
    presentDocumentCommitmentCategory(category).contents.map(
      (content) => content.description,
    ),
    [null, 'Company reports'],
  );
  assert.equal(
    presentDocumentCommitmentCategoryListItem(category, 'en').description,
    'Company reports',
  );
  assert.equal(
    presentDocumentCommitmentCategoryListItem(category).description,
    null,
  );
  assert.equal(
    presentDocumentCommitmentCategoryListItem(category, 'fr').description,
    null,
  );
  assert.deepEqual(
    presentDocumentCommitment(document).document_commitment_category,
    presentDocumentCommitmentCategory(category),
  );
  assert.deepEqual(
    presentDocumentCommitmentListItem(document, 'en')
      .document_commitment_category,
    presentDocumentCommitmentCategoryListItem(category, 'en'),
  );
  assert.equal(
    presentDocumentCommitmentListItem(document, 'id')
      .document_commitment_category.description,
    null,
  );
});
