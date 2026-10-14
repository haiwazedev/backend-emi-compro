import type { Request, Response } from 'express';
import { ApiError } from '../../../shared/errors/api-error.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentFaq } from '../presenters/faq.presenter.js';
import { FaqService } from '../services/faq.service.js';
import type {
  CreateFaqInput,
  FaqListQuery,
  ReorderFaqsInput,
  UpdateFaqInput,
} from '../schemas/faq.schema.js';

export class FaqController {
  constructor(private readonly service = new FaqService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.faqListQuery as FaqListQuery;
    const faqs = await this.service.list(query);

    res.status(200).json({ faqs: faqs.map(presentFaq) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const faq = await this.service.getById(parseIdParam(req.params.faqId));

    res.status(200).json({ faq: presentFaq(faq) });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const faqs = await this.service.reorder(req.body as ReorderFaqsInput);

    res.status(200).json({ faqs: faqs.map(presentFaq) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const faq = await this.service.create(
      req.body as CreateFaqInput,
      getAuthenticatedUserName(req),
    );

    res.status(201).json({ faq: presentFaq(faq) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const faq = await this.service.update(
      parseIdParam(req.params.faqId),
      req.body as UpdateFaqInput,
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
