import { prisma } from '../../../shared/db/prisma.js';

// Small per-group cap: the search dialog only shows the top matches.
const RESULT_LIMIT = 5;

function contains(q: string) {
  return { contains: q, mode: 'insensitive' as const };
}

export class SearchRepository {
  constructor(private readonly client = prisma) {}

  findArticles(q: string) {
    return this.client.articleContent.findMany({
      where: { OR: [{ title: contains(q) }, { summary: contains(q) }] },
      distinct: ['articleId'],
      take: RESULT_LIMIT,
      orderBy: { articleId: 'desc' },
      select: { articleId: true, languageId: true, title: true },
    });
  }

  findDocumentCommitments(q: string) {
    return this.client.documentCommitmentContent.findMany({
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
    return this.client.divisionContent.findMany({
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

  async findServices(q: string) {
    const [nameMatches, descriptionMatches] = await Promise.all([
      this.client.serviceContent.findMany({
        where: { name: contains(q) },
        distinct: ['serviceId'],
        take: RESULT_LIMIT,
        orderBy: { serviceId: 'asc' },
        select: { serviceId: true, languageId: true, name: true },
      }),
      this.client.serviceMediaContent.findMany({
        where: { description: contains(q) },
        distinct: ['serviceId'],
        take: RESULT_LIMIT,
        orderBy: [{ serviceId: 'asc' }, { languageId: 'asc' }],
        select: {
          serviceId: true,
          languageId: true,
          serviceMedia: {
            select: {
              service: {
                select: {
                  contents: {
                    select: { languageId: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const matches = new Map<
      number,
      { serviceId: number; languageId: string; name: string }
    >();

    for (const match of nameMatches) {
      matches.set(match.serviceId, match);
    }

    for (const match of descriptionMatches) {
      const content = match.serviceMedia.service.contents.find(
        ({ languageId }) => languageId === match.languageId,
      );

      if (content) {
        matches.set(match.serviceId, {
          serviceId: match.serviceId,
          languageId: match.languageId,
          name: content.name,
        });
      }
    }

    return [...matches.values()]
      .sort(
        (a, b) =>
          a.serviceId - b.serviceId || a.languageId.localeCompare(b.languageId),
      )
      .slice(0, RESULT_LIMIT);
  }

  findBoardMembers(q: string) {
    return this.client.boardMember.findMany({
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
    return this.client.user.findMany({
      where: { OR: [{ name: contains(q) }, { email: contains(q) }] },
      take: RESULT_LIMIT,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  findInboxes(q: string) {
    return this.client.inbox.findMany({
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
    return this.client.faqContent.findMany({
      where: { OR: [{ question: contains(q) }, { answer: contains(q) }] },
      distinct: ['faqId'],
      take: RESULT_LIMIT,
      orderBy: { faqId: 'asc' },
      select: { faqId: true, languageId: true, question: true },
    });
  }
}
