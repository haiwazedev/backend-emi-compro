import { Prisma } from '../src/generated/prisma/client.js';
import { prisma } from '../src/shared/db/prisma.js';
import {
  contentDefinitions,
  type ContentDefinition,
} from '../src/module/content/content-definitions.js';
import { ClientLogoFileService } from '../src/module/client/services/client-logo-file.service.js';

type ContentSeedData = Pick<
  ContentDefinition,
  'page' | 'blockKey' | 'blockType'
> & {
  data: Readonly<Record<string, string>> | null;
};

const contentSeedData = [
  {
    page: 'home',
    blockKey: 'hero-carousel',
    blockType: 'carousel-slide',
    data: {
      title_1: 'Contoh judul utama',
      title_2: 'Konten unggulan',
      subtitle: 'Contoh deskripsi carousel',
    },
  },
  {
    page: 'home',
    blockKey: 'statistic',
    blockType: 'statistic-item',
    data: {
      label: 'Pelanggan',
      number: '1000+',
      description: 'Contoh data statistik',
    },
  },
  {
    page: 'home',
    blockKey: 'teaser',
    blockType: 'teaser-title',
    data: { title: 'Contoh judul teaser' },
  },
  {
    page: 'home',
    blockKey: 'teaser',
    blockType: 'cta-title',
    data: { title: 'Hubungi Kami' },
  },
  {
    page: 'home',
    blockKey: 'teaser',
    blockType: 'teaser-content',
    data: { content: 'Contoh konten teaser untuk halaman beranda.' },
  },
  {
    page: 'about-us',
    blockKey: 'company-profile',
    blockType: 'profile-content',
    data: { content: 'Contoh profil perusahaan untuk konten awal.' },
  },
  {
    page: 'about-us',
    blockKey: 'company-profile',
    blockType: 'company-picture',
    data: null,
  },
  {
    page: 'about-us',
    blockKey: 'mission-vision',
    blockType: 'vision',
    data: { content: 'Menjadi perusahaan energi berdaya saing.' },
  },
  {
    page: 'about-us',
    blockKey: 'mission-vision',
    blockType: 'mission-item',
    data: {
      title: 'Mendukung energi berkelanjutan',
      description: 'Contoh deskripsi misi perusahaan.',
    },
  },
  {
    page: 'about-us',
    blockKey: 'history_timeline',
    blockType: 'timeline-item',
    data: {
      period: '2024',
      description: 'Contoh catatan sejarah perusahaan.',
    },
  },
] satisfies readonly ContentSeedData[];

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

// 1x1 transparent PNG; replace the real logos through the CMS.
const placeholderLogo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
  'base64',
);

function getSeedData(definition: ContentDefinition) {
  return (
    contentSeedData.find(
      (seed) =>
        seed.page === definition.page &&
        seed.blockKey === definition.blockKey &&
        seed.blockType === definition.blockType,
    )?.data ?? null
  );
}

async function seedContent(): Promise<void> {
  for (const definition of contentDefinitions) {
    const seedData = getSeedData(definition);
    const where = {
      page_blockKey_blockType_sortOrder: {
        page: definition.page,
        blockKey: definition.blockKey,
        blockType: definition.blockType,
        sortOrder: 1,
      },
    };
    const content = await prisma.content.upsert({
      where,
      create: {
        page: definition.page,
        blockKey: definition.blockKey,
        blockType: definition.blockType,
        sortOrder: 1,
        ...(seedData === null
          ? {}
          : { data: seedData as Prisma.InputJsonValue }),
        mediaId: null,
        createdBy: 'system',
      },
      update: {},
    });

    if (content.data === null && seedData !== null) {
      await prisma.content.update({
        where,
        data: { data: seedData as Prisma.InputJsonValue },
      });
    }
  }
}

async function seedFaqs(): Promise<void> {
  if ((await prisma.faq.count()) > 0) {
    return;
  }

  await prisma.faq.createMany({
    data: faqSeedData.map((faq, index) => ({
      ...faq,
      status: 'PUBLISHED',
      sortOrder: index + 1,
      createdBy: 'system',
    })),
  });
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

async function seed(): Promise<void> {
  await seedContent();
  await seedFaqs();
  await seedClients();
  await seedInboxSubjects();
}

seed()
  .catch((error: unknown) => {
    console.error('Seeding failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
