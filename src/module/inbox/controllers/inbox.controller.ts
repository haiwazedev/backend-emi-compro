import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import {
  presentInbox,
  presentInboxSubject,
} from '../presenters/inbox.presenter.js';
import { InboxService } from '../services/inbox.service.js';
import type {
  CreateInboxInput,
  InboxListQuery,
  UpdateInboxInput,
} from '../schemas/inbox.schema.js';

export class InboxController {
  constructor(private readonly service = new InboxService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.inboxListQuery as InboxListQuery;
    const result = await this.service.list(query);

    res.status(200).json({
      inboxes: result.inboxes.map(presentInbox),
      pagination: result.pagination,
    });
  };

  counts = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.service.counts());
  };

  listSubjects = async (_req: Request, res: Response): Promise<void> => {
    const subjects = await this.service.listSubjects();

    res.status(200).json({ inbox_subjects: subjects.map(presentInboxSubject) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const inbox = await this.service.create(req.body as CreateInboxInput);

    res.status(201).json({ inbox: presentInbox(inbox) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const inbox = await this.service.update(
      parseIdParam(req.params.inboxId),
      req.body as UpdateInboxInput,
    );

    res.status(200).json({ inbox: presentInbox(inbox) });
  };

  markAllRead = async (_req: Request, res: Response): Promise<void> => {
    await this.service.markAllRead();
    res.status(204).end();
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseIdParam(req.params.inboxId));
    res.status(204).end();
  };
}
