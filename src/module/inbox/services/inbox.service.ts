import { ApiError } from '../../../shared/errors/api-error.js';
import { InboxRepository } from '../repositories/inbox.repository.js';
import type {
  CreateInboxInput,
  InboxListQuery,
  UpdateInboxInput,
} from '../schemas/inbox.schema.js';

export class InboxService {
  constructor(private readonly repository = new InboxRepository()) {}

  async list(query: InboxListQuery) {
    const [inboxes, totalItems] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    return {
      inboxes,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  async counts() {
    const [unreadCount, readCount] = await Promise.all([
      this.repository.countByReadStatus(false),
      this.repository.countByReadStatus(true),
    ]);

    return { unreadCount, readCount };
  }

  listSubjects() {
    return this.repository.findSubjects();
  }

  async create(input: CreateInboxInput) {
    if (!(await this.repository.findSubjectById(input.inbox_subject_id))) {
      throw new ApiError(400, 'Inbox subject was not found.');
    }

    return this.repository.create({
      inboxSubjectId: input.inbox_subject_id,
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      phone: input.phone ?? null,
      message: input.message,
    });
  }

  async update(id: number, input: UpdateInboxInput) {
    await this.requireInbox(id);

    return this.repository.update(id, { isRead: input.is_read });
  }

  async markAllRead(): Promise<void> {
    await this.repository.markAllRead();
  }

  async delete(id: number): Promise<void> {
    await this.requireInbox(id);
    await this.repository.delete(id);
  }

  private async requireInbox(id: number): Promise<void> {
    if (!(await this.repository.findById(id))) {
      throw new ApiError(404, 'Inbox was not found.');
    }
  }
}
