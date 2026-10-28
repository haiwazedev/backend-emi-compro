import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  createServiceBodySchema,
  updateServiceBodySchema,
} from '../src/module/service/schemas/service.schema.js';
import { presentService } from '../src/module/service/presenters/service.presenter.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const [{ replaceServiceMedia }, { SearchRepository }, { ServiceService }] =
  await Promise.all([
    import('../src/module/service/repositories/service.repository.js'),
    import('../src/module/search/repositories/search.repository.js'),
    import('../src/module/service/services/service.service.js'),
  ]);

test('service API accepts localized media descriptions and rejects parent descriptions', () => {
  const parsed = createServiceBodySchema.parse({
    language_id: 'en',
    division_id: 1,
    name: 'Energy Audit',
    media: [
      { media_id: 24, description: '  ' },
      { media_id: 31, description: null },
    ],
  });

  assert.deepEqual(parsed.media, [
    { media_id: 24, description: null },
    { media_id: 31, description: null },
  ]);
  assert.equal(
    createServiceBodySchema.safeParse({
      language_id: 'en',
      division_id: 1,
      name: 'Energy Audit',
      description: 'Parent description',
    }).success,
    false,
  );
  assert.equal(
    createServiceBodySchema.safeParse({
      language_id: 'en',
      division_id: 1,
      name: 'Energy Audit',
      media_ids: [24],
    }).success,
    false,
  );
});

test('service media updates require a language and unique media IDs', () => {
  assert.equal(
    updateServiceBodySchema.safeParse({
      media: [{ media_id: 24, description: 'Audit' }],
    }).success,
    false,
  );
  assert.equal(
    updateServiceBodySchema.safeParse({ language_id: 'en' }).success,
    false,
  );
  assert.equal(
    updateServiceBodySchema.safeParse({
      language_id: 'en',
      media: [{ media_id: 24 }, { media_id: 24 }],
    }).success,
    false,
  );
  assert.equal(
    updateServiceBodySchema.safeParse({ language_id: 'en', media: [] }).success,
    true,
  );
});

test('adding media descriptions in a new language requires a service name', async () => {
  let updated = false;
  const service = new ServiceService(
    {
      findById: async () => ({
        id: 4,
        contents: [{ languageId: 'en', name: 'Energy Audit' }],
      }),
      update: async () => {
        updated = true;
        return {
          id: 4,
          contents: [{ languageId: 'en', name: 'Energy Audit' }],
        };
      },
    } as never,
    {} as never,
    { findManyByIds: async () => [{ type: 'PICTURE' }] } as never,
    { requireActive: async () => undefined } as never,
    { log: async () => undefined } as never,
  );

  await assert.rejects(
    service.update(
      4,
      { language_id: 'id', media: [{ media_id: 24, description: 'Audit' }] },
      { id: 1, name: 'Test Admin', permissions: ['write'] },
    ),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 400,
  );

  assert.equal(updated, false);
});

test('service media replacement retains translations on linked media', async () => {
  const links = [
    { serviceId: 4, mediaId: 24, sortOrder: 1 },
    { serviceId: 4, mediaId: 31, sortOrder: 2 },
  ];
  const contents = [
    { serviceId: 4, mediaId: 24, languageId: 'en', description: 'Old EN 24' },
    { serviceId: 4, mediaId: 24, languageId: 'id', description: 'ID 24' },
    { serviceId: 4, mediaId: 31, languageId: 'en', description: 'EN 31' },
    { serviceId: 4, mediaId: 31, languageId: 'id', description: 'ID 31' },
  ];
  const transaction = makeServiceMediaTransaction(links, contents);

  await replaceServiceMedia(transaction as never, 4, 'en', [
    { media_id: 31 },
    { media_id: 42, description: 'New EN 42' },
    { media_id: 24, description: null },
  ]);

  assert.deepEqual(
    links
      .filter(({ serviceId }) => serviceId === 4)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ mediaId, sortOrder }) => ({ mediaId, sortOrder })),
    [
      { mediaId: 31, sortOrder: 1 },
      { mediaId: 42, sortOrder: 2 },
      { mediaId: 24, sortOrder: 3 },
    ],
  );
  assert.equal(findContent(contents, 31, 'en')?.description, 'EN 31');
  assert.equal(findContent(contents, 31, 'id')?.description, 'ID 31');
  assert.equal(findContent(contents, 24, 'en')?.description, null);
  assert.equal(findContent(contents, 24, 'id')?.description, 'ID 24');
  assert.equal(findContent(contents, 42, 'en')?.description, 'New EN 42');

  await replaceServiceMedia(transaction as never, 4, 'en', []);

  assert.equal(links.length, 0);
  assert.equal(contents.length, 0);
});

test('service responses nest localized descriptions under each media item', () => {
  const now = new Date('2026-10-11T10:30:00.000Z');
  const service = presentService({
    id: 12,
    divisionId: 1,
    sortOrder: 1,
    createdAt: now,
    createdBy: 'Ari Putra',
    updatedAt: null,
    updatedBy: null,
    contents: [{ serviceId: 12, languageId: 'en', name: 'Customer Support' }],
    division: {
      id: 1,
      iconSvg: null,
      status: 'PUBLISHED',
      sortOrder: 1,
      createdAt: now,
      createdBy: 'Ari Putra',
      updatedAt: null,
      updatedBy: null,
      contents: [
        {
          divisionId: 1,
          languageId: 'en',
          name: 'Customer Services',
          slug: 'customer-services',
          abbr: 'CS',
          description: null,
        },
      ],
    },
    mediaLinks: [
      {
        serviceId: 12,
        mediaId: 24,
        sortOrder: 1,
        media: {
          id: 24,
          filename: 'customer-support.jpg',
          alt: null,
          path: '/public/media/customer-support.jpg',
          extension: 'jpg',
          type: 'PICTURE',
          size: 245760,
          metadata: { width: 1600, height: 900 },
          createdBy: 'Ari Putra',
          createdAt: now,
        },
        contents: [
          {
            serviceId: 12,
            mediaId: 24,
            languageId: 'en',
            description: 'On-site customer support.',
          },
        ],
      },
    ],
  } as never);

  assert.deepEqual(service.contents, [
    { language_id: 'en', name: 'Customer Support' },
  ]);
  assert.deepEqual(service.media[0].contents, [
    { language_id: 'en', description: 'On-site customer support.' },
  ]);
});

test('service search matches localized media descriptions', async () => {
  const repository = new SearchRepository({
    serviceContent: {
      findMany: async () => [
        { serviceId: 1, languageId: 'en', name: 'Energy Audit' },
      ],
    },
    serviceMediaContent: {
      findMany: async () => [
        {
          serviceId: 2,
          languageId: 'id',
          serviceMedia: {
            service: {
              contents: [
                { languageId: 'en', name: 'Energy Audit' },
                { languageId: 'id', name: 'Audit Energi' },
              ],
            },
          },
        },
      ],
    },
  } as never);
  const result = await repository.findServices('audit');

  assert.deepEqual(result, [
    { serviceId: 1, languageId: 'en', name: 'Energy Audit' },
    { serviceId: 2, languageId: 'id', name: 'Audit Energi' },
  ]);
});

test('migration copies localized descriptions to linked media before dropping the parent field', () => {
  const migration = readFileSync(
    new URL(
      '../prisma/migrations/20261028120000_service_media_descriptions/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    migration,
    /INSERT INTO "service_media_contents"[\s\S]*SELECT service_media\."service_id"[\s\S]*service_contents\."language_id"[\s\S]*FROM "service_media"[\s\S]*JOIN "service_contents"/,
  );
  assert.match(
    migration,
    /ALTER TABLE "service_contents"\s+DROP COLUMN "description"/,
  );
});

function makeServiceMediaTransaction(
  links: { serviceId: number; mediaId: number; sortOrder: number }[],
  contents: {
    serviceId: number;
    mediaId: number;
    languageId: string;
    description: string | null;
  }[],
) {
  return {
    serviceMedia: {
      findMany: async () =>
        links.map(({ mediaId, sortOrder }) => ({ mediaId, sortOrder })),
      update: async (args: {
        where: { serviceId_mediaId: { serviceId: number; mediaId: number } };
        data: { sortOrder: number };
      }) => {
        const link = links.find(
          ({ serviceId, mediaId }) =>
            serviceId === args.where.serviceId_mediaId.serviceId &&
            mediaId === args.where.serviceId_mediaId.mediaId,
        );
        assert.ok(link);
        link.sortOrder = args.data.sortOrder;
        return link;
      },
      deleteMany: async (args: {
        where: { serviceId: number; mediaId?: { notIn: number[] } };
      }) => {
        const removed = links.filter(
          ({ serviceId, mediaId }) =>
            serviceId === args.where.serviceId &&
            (args.where.mediaId === undefined ||
              !args.where.mediaId.notIn.includes(mediaId)),
        );
        for (const link of removed) {
          links.splice(links.indexOf(link), 1);
          for (const content of [...contents]) {
            if (
              content.serviceId === link.serviceId &&
              content.mediaId === link.mediaId
            ) {
              contents.splice(contents.indexOf(content), 1);
            }
          }
        }
        return { count: removed.length };
      },
      upsert: async (args: {
        where: { serviceId_mediaId: { serviceId: number; mediaId: number } };
        create: { serviceId: number; mediaId: number; sortOrder: number };
        update: { sortOrder: number };
      }) => {
        const link = links.find(
          ({ serviceId, mediaId }) =>
            serviceId === args.where.serviceId_mediaId.serviceId &&
            mediaId === args.where.serviceId_mediaId.mediaId,
        );
        if (link) {
          link.sortOrder = args.update.sortOrder;
          return link;
        }
        links.push(args.create);
        return args.create;
      },
    },
    serviceMediaContent: {
      upsert: async (args: {
        where: {
          serviceId_mediaId_languageId: {
            serviceId: number;
            mediaId: number;
            languageId: string;
          };
        };
        create: {
          serviceId: number;
          mediaId: number;
          languageId: string;
          description: string | null;
        };
        update: { description?: string | null };
      }) => {
        const key = args.where.serviceId_mediaId_languageId;
        const content = contents.find(
          (item) =>
            item.serviceId === key.serviceId &&
            item.mediaId === key.mediaId &&
            item.languageId === key.languageId,
        );
        if (content) {
          if ('description' in args.update) {
            content.description = args.update.description ?? null;
          }
          return content;
        }
        contents.push(args.create);
        return args.create;
      },
    },
  };
}

function findContent(
  contents: {
    serviceId: number;
    mediaId: number;
    languageId: string;
    description: string | null;
  }[],
  mediaId: number,
  languageId: string,
) {
  return contents.find(
    (content) =>
      content.mediaId === mediaId && content.languageId === languageId,
  );
}
