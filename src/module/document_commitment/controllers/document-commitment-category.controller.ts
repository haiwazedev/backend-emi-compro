import type { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentDocumentCommitmentCategory } from '../presenters/document-commitment-category.presenter.js';
import { DocumentCommitmentCategoryService } from '../services/document-commitment-category.service.js';
import type {
  CreateDocumentCommitmentCategoryInput,
  UpdateDocumentCommitmentCategoryInput,
} from '../schemas/document-commitment-category.schema.js';

export class DocumentCommitmentCategoryController {
  constructor(
    private readonly service = new DocumentCommitmentCategoryService(),
  ) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.service.list();

    res.status(200).json({
      documentCommitmentCategories: categories.map(
        presentDocumentCommitmentCategory,
      ),
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.getById(
      parseIdParam(req.params.categoryId),
    );

    res.status(200).json({
      documentCommitmentCategory: presentDocumentCommitmentCategory(category),
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.create(
      req.body as CreateDocumentCommitmentCategoryInput,
      getAuthenticatedUser(req),
    );

    res.status(201).json({
      documentCommitmentCategory: presentDocumentCommitmentCategory(category),
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.update(
      parseIdParam(req.params.categoryId),
      req.body as UpdateDocumentCommitmentCategoryInput,
      getAuthenticatedUser(req),
    );

    res.status(200).json({
      documentCommitmentCategory: presentDocumentCommitmentCategory(category),
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.categoryId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
