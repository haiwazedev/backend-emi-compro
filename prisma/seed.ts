import { prisma } from '../src/shared/db/prisma.js';
import { ClientLogoFileService } from '../src/module/client/services/client-logo-file.service.js';

const faqSeedData = [
  {
    question: 'Apa itu REC dan SPE?',
    answer:
      '<p>REC adalah instrumen berupa sertifikat yang membuktikan bahwa setiap 1 MWh listrik yang dikonsumsi oleh operasional perusahaan berasal dari pembangkit energi terbarukan yang tersertifikasi.</p><p>Sedangkan SPE adalah instrumen berupa sertifikat yang membuktikan bahwa perusahaan telah mendanai atau mengkompensasi proyek penurunan emisi karbon secara nyata di tempat lain (carbon offset).</p>',
  },
  {
    question: 'Apa hubungannya REC dan SPE ini dengan GHG Accounting?',
    answer: '<p>-</p>',
  },
  {
    question:
      'Berapa harga 1 unit REC dan 1 unit SPE? Dan bagaimana cara perhitungannya?',
    answer: '<p>-</p>',
  },
  {
    question: 'Bagaimana skema pembelian REC atau SPE di PLN EMI?',
    answer: '<p>-</p>',
  },
] as const;

const clientSeedNames = [
  'Accenture',
  'ASTRA Otoparts',
  'Cargill',
  'H&M',
  'PT Golden Tekstil Indonesia',
  'Pupuk Iskandar Muda',
  'The Ritz-Carlton',
  'UNIQLO',
] as const;

const inboxSubjectSeedNames = [
  'General Inquiry',
  'Services',
  'Media & Information',
  'Partnerships',
] as const;

// Master site setting keys; values are filled through the CMS.
const siteSettingSeedKeys = [
  'company_name',
  'company_short_name',
  'danantara_logo',
  'pln_logo',
  'company_address',
  'company_location_lat',
  'company_location_long',
  'company_phone_number',
  'company_whatsapp_number',
  'main_email',
  'marketing_email',
  'operational_day',
  'operational_start_time',
  'operational_end_time',
] as const;

// shortcut: permissions added later get no role_permissions rows for existing roles, backfill them in a migration when that happens.
const permissionSeedNames = [
  'view',
  'write',
  'publish',
  'delete',
  'manage_users',
] as const;

// 1x1 transparent PNG; replace the real logos through the CMS.
const placeholderLogo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
  'base64',
);

async function seedFaqs(): Promise<void> {
  if ((await prisma.faq.count()) > 0) {
    return;
  }

  for (const [index, faq] of faqSeedData.entries()) {
    await prisma.faq.create({
      data: {
        sortOrder: index + 1,
        createdBy: 'system',
        contents: {
          create: {
            ...faq,
            languageId: 'id',
            status: 'PUBLISHED',
            createdBy: 'system',
          },
        },
      },
    });
  }
}

async function seedClients(): Promise<void> {
  if ((await prisma.client.count()) > 0) {
    return;
  }

  const logoFileService = new ClientLogoFileService();

  for (const [index, name] of clientSeedNames.entries()) {
    const logo = await logoFileService.store(`${name}.png`, placeholderLogo);

    await prisma.client.create({
      data: {
        name,
        logoFilename: logo.filename,
        logoFilepath: logo.filepath,
        logoExtension: logo.extension,
        logoSize: logo.size,
        logoMetadata: logo.metadata,
        sortOrder: index + 1,
        createdBy: 'system',
      },
    });
  }
}

async function seedInboxSubjects(): Promise<void> {
  await prisma.inboxSubject.createMany({
    data: inboxSubjectSeedNames.map((name) => ({ name, createdBy: 'system' })),
    skipDuplicates: true,
  });
}

async function seedLanguages(): Promise<void> {
  await prisma.language.createMany({
    data: [
      { id: 'id', language: 'Bahasa Indonesia', flag: '🇮🇩', sortOrder: 1 },
      { id: 'en', language: 'English', flag: '🇬🇧', sortOrder: 2 },
    ].map((language) => ({ ...language, createdBy: 'system' })),
    skipDuplicates: true,
  });
}

async function seedSiteSettings(): Promise<void> {
  const languages = await prisma.language.findMany();

  await prisma.siteSetting.createMany({
    data: languages.flatMap((language) =>
      siteSettingSeedKeys.map((key) => ({
        key,
        languageId: language.id,
        createdBy: 'system',
      })),
    ),
    skipDuplicates: true,
  });
}

async function seedPermissions(): Promise<void> {
  await prisma.permission.createMany({
    data: permissionSeedNames.map((name) => ({ name, createdBy: 'system' })),
    skipDuplicates: true,
  });
}

async function seed(): Promise<void> {
  await seedLanguages();
  await seedFaqs();
  await seedClients();
  await seedInboxSubjects();
  await seedSiteSettings();
  await seedPermissions();
}

seed()
  .catch((error: unknown) => {
    console.error('Seeding failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
