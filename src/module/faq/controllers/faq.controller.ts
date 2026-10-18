import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentFaq, presentFaqListItem } from '../presenters/faq.presenter.js';
import { FaqService } from '../services/faq.service.js';
import type {
  FaqContentInput,
  FaqListQuery,
  ReorderFaqsInput,
} from '../schemas/faq.schema.js';

export class FaqController {
  constructor(private readonly service = new FaqService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.faqListQuery as FaqListQuery;
    const { faqs, languages } = await this.service.list(query);

    res.status(200).json({
      faqs: faqs.map((faq) =>
        presentFaqListItem(faq, languages, query.language_id),
      ),
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const faq = await this.service.getById(parseIdParam(req.params.faqId));

    res.status(200).json({ faq: presentFaq(faq) });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const { faqs, languages } = await this.service.reorder(
      req.body as ReorderFaqsInput,
    );

    res.status(200).json({
      faqs: faqs.map((faq) => presentFaqListItem(faq, languages)),
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const faq = await this.service.create(
      req.body as FaqContentInput,
      getAuthenticatedUserName(req),
    );

    res.status(201).json({ faq: presentFaq(faq) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const faq = await this.service.update(
      parseIdParam(req.params.faqId),
      req.body as FaqContentInput,
      getAuthenticatedUserName(req),
    );

    res.status(200).json({ faq: presentFaq(faq) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseIdParam(req.params.faqId));
    res.status(204).end();
  };
}

function getAuthenticatedUserName(req: Request): string {
  if (!req.authenticatedUser) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return req.authenticatedUser.name;
}
