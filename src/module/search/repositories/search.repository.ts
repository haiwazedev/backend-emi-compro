import { prisma } from '../../../shared/db/prisma.js';

// Small per-group cap: the search dialog only shows the top matches.
const RESULT_LIMIT = 5;

function contains(q: string) {
  return { contains: q, mode: 'insensitive' as const };
}

export class SearchRepository {
  findArticles(q: string) {
    return prisma.articleContent.findMany({
      where: { OR: [{ title: contains(q) }, { summary: contains(q) }] },
      distinct: ['articleId'],
      take: RESULT_LIMIT,
      orderBy: { articleId: 'desc' },
      select: { articleId: true, languageId: true, title: true },
    });
  }

  findDocumentCommitments(q: string) {
    return prisma.documentCommitmentContent.findMany({
      where: { title: contains(q) },
      distinct: ['documentCommitmentId'],
      take: RESULT_LIMIT,
      orderBy: [{ documentCommitmentId: 'desc' }, { languageId: 'asc' }],
      select: {
        documentCommitmentId: true,
        languageId: true,
        title: true,
      },
    });
  }

  findDivisions(q: string) {
    return prisma.divisionContent.findMany({
      where: {
        OR: [
          { name: contains(q) },
          { abbr: contains(q) },
          { description: contains(q) },
        ],
      },
      distinct: ['divisionId'],
      take: RESULT_LIMIT,
      orderBy: { divisionId: 'asc' },
      select: { divisionId: true, languageId: true, name: true },
    });
  }

  findServices(q: string) {
    return prisma.serviceContent.findMany({
      where: { OR: [{ name: contains(q) }, { description: contains(q) }] },
      distinct: ['serviceId'],
      take: RESULT_LIMIT,
      orderBy: { serviceId: 'asc' },
      select: { serviceId: true, languageId: true, name: true },
    });
  }

  findBoardMembers(q: string) {
    return prisma.boardMember.findMany({
      where: {
        OR: [
          { name: contains(q) },
          { companyName: contains(q) },
          {
            contents: {
              some: {
                OR: [{ role: contains(q) }, { description: contains(q) }],
              },
            },
          },
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });
  }

  findUsers(q: string) {
    return prisma.user.findMany({
      where: { OR: [{ name: contains(q) }, { email: contains(q) }] },
      take: RESULT_LIMIT,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  findInboxes(q: string) {
    return prisma.inbox.findMany({
      where: {
        OR: [
          { name: contains(q) },
          { email: contains(q) },
          { company: contains(q) },
          { message: contains(q) },
          { inboxSubject: { name: contains(q) } },
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    });
  }

  findFaqs(q: string) {
    return prisma.faqContent.findMany({
      where: { OR: [{ question: contains(q) }, { answer: contains(q) }] },
      distinct: ['faqId'],
      take: RESULT_LIMIT,
      orderBy: { faqId: 'asc' },
      select: { faqId: true, languageId: true, question: true },
    });
  }
}
