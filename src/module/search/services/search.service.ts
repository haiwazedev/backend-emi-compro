import { SearchRepository } from '../repositories/search.repository.js';

export class SearchService {
  constructor(private readonly repository = new SearchRepository()) {}

  // Users are only searched for callers who may manage them, like `GET /users`.
  async search(q: string, canManageUsers: boolean) {
    const [
      articles,
      documentCommitments,
      divisions,
      services,
      boardMembers,
      faqs,
      users,
      inboxes,
    ] = await Promise.all([
      this.repository.findArticles(q),
      this.repository.findDocumentCommitments(q),
      this.repository.findDivisions(q),
      this.repository.findServices(q),
      this.repository.findBoardMembers(q),
      this.repository.findFaqs(q),
      canManageUsers ? this.repository.findUsers(q) : [],
      this.repository.findInboxes(q),
    ]);

    return {
      articles,
      documentCommitments,
      divisions,
      services,
      boardMembers,
      faqs,
      users,
      inboxes,
    };
  }
}
