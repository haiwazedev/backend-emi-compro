import type { Inbox, InboxSubject } from '../../../generated/prisma/client.js';

export function presentInboxSubject(subject: InboxSubject) {
  return { id: subject.id, name: subject.name };
}

export function presentInbox(inbox: Inbox & { inboxSubject: InboxSubject }) {
  return {
    id: inbox.id,
    name: inbox.name,
    email: inbox.email,
    company: inbox.company,
    phone: inbox.phone,
    message: inbox.message,
    is_read: inbox.isRead,
    inbox_subject: presentInboxSubject(inbox.inboxSubject),
    created_at: inbox.createdAt.toISOString(),
  };
}
