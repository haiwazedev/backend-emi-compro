import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Prisma } from '../src/generated/prisma/client.js';
import type { ActivityLogService } from '../src/module/activity_log/services/activity-log.service.js';
import type { AuthenticatedUser } from '../src/module/auth/authenticated-user.js';
import type { DivisionRepository } from '../src/module/division/repositories/division.repository.js';
import type { CreateDivisionInput } from '../src/module/division/schemas/division.schema.js';
import type { LanguageService } from '../src/module/language/services/language.service.js';
import type { DivisionWithContents } from '../src/module/division/presenters/division.presenter.js';
import { presentDivision } from '../src/module/division/presenters/division.presenter.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
const { DivisionService } =
  await import('../src/module/division/services/division.service.js');

const unsafeSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><a href="javascript:alert(2)"><circle cx="12" cy="12" r="10" fill="#0a7"></circle></a></svg>';
const safeSvg =
  '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#0a7"></circle></svg>';

test('division create and update save sanitized SVG markup', async () => {
  let createdIcon: string | null | undefined;
  let updatedIcon: string | null | undefined;
  const division = makeDivision(null);
  const repository = {
    create: async (data: Prisma.DivisionUncheckedCreateInput) => {
      createdIcon = data.iconSvg;
      return division;
    },
    findById: async () => division,
    update: async (_id: number, data: Prisma.DivisionUncheckedUpdateInput) => {
      updatedIcon = data.iconSvg as string | null | undefined;
      return division;
    },
  } as unknown as DivisionRepository;
  const languageService = {
    requireActive: async () => undefined,
  } as unknown as LanguageService;
  const activityLogService = {
    log: async () => undefined,
  } as unknown as ActivityLogService;
  const service = new DivisionService(
    repository,
    languageService,
    activityLogService,
  );
  const user: AuthenticatedUser = {
    id: 1,
    name: 'Test Admin',
    permissions: ['write'],
  };
  const createInput: CreateDivisionInput = {
    language_id: 'id',
    name: 'Test Division',
    abbr: 'TD',
    icon_svg: unsafeSvg,
  };

  await service.create(createInput, user);
  await service.update(1, { icon_svg: unsafeSvg }, user);

  assertSanitizedSvg(createdIcon);
  assertSanitizedSvg(updatedIcon);
});

test('division presentation preserves safe SVG and removes unsafe markup', () => {
  const presented = presentDivision(makeDivision(unsafeSvg));

  assertSanitizedSvg(presented.icon_svg);
  assert.match(presented.icon_svg ?? '', /<circle\b/);
});

test('division presentation returns null for malformed stored SVG', () => {
  const presented = presentDivision(makeDivision('<div>not an SVG</div>'));

  assert.equal(presented.icon_svg, null);
});

test('division presentation keeps a safe icon as SVG markup', () => {
  const presented = presentDivision(makeDivision(safeSvg));

  assert.equal(presented.icon_svg, safeSvg);
});

function assertSanitizedSvg(svg: string | null | undefined): void {
  assert.ok(svg);
  assert.match(svg, /^<svg[\s>]/i);
  assert.match(svg, /<circle\b/);
  assert.doesNotMatch(svg, /<script\b|onload\s*=|foreignObject|javascript:/i);
}

function makeDivision(iconSvg: string | null): DivisionWithContents {
  const now = new Date('2026-10-25T00:00:00.000Z');
  return {
    id: 1,
    iconSvg,
    status: 'PUBLISHED',
    sortOrder: 1,
    createdAt: now,
    createdBy: 'Test Admin',
    updatedAt: null,
    updatedBy: null,
    contents: [
      {
        divisionId: 1,
        languageId: 'id',
        name: 'Test Division',
        abbr: 'TD',
        description: null,
      },
    ],
  } as DivisionWithContents;
}
