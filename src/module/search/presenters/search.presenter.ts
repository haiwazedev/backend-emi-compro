import type { SearchService } from '../services/search.service.js';

type SearchResult = Awaited<ReturnType<SearchService['search']>>;

export function presentSearchResult(result: SearchResult) {
  return {
    articles: result.articles.map((article) => ({
      id: article.articleId,
      language_id: article.languageId,
      title: article.title,
    })),
    document_commitments: result.documentCommitments.map((document) => ({
      id: document.id,
      title: document.title,
    })),
    divisions: result.divisions.map((division) => ({
      id: division.divisionId,
      language_id: division.languageId,
      title: division.name,
    })),
    services: result.services.map((service) => ({
      id: service.serviceId,
      language_id: service.languageId,
      title: service.name,
    })),
    board_members: result.boardMembers.map((boardMember) => ({
      id: boardMember.id,
      title: boardMember.name,
    })),
    users: result.users.map((user) => ({ id: user.id, title: user.name })),
    inboxes: result.inboxes.map((inbox) => ({
      id: inbox.id,
      title: inbox.name,
    })),
    faqs: result.faqs.map((faq) => ({
      id: faq.faqId,
      language_id: faq.languageId,
      title: faq.question,
    })),
  };
}
