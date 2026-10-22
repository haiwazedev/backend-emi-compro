import type { Request, Response } from 'express';
import { canSeeDrafts } from '../../auth/auth.middleware.js';
import { getAuthenticatedUser } from '../../auth/authenticated-user.js';
import { parseIdParam } from '../../../shared/schemas/common.schema.js';
import { presentDocumentCommitment } from '../presenters/document-commitment.presenter.js';
import { DocumentCommitmentService } from '../services/document-commitment.service.js';
import type {
  CreateDocumentCommitmentInput,
  DocumentCommitmentListQuery,
  UpdateDocumentCommitmentInput,
} from '../schemas/document-commitment.schema.js';

export class DocumentCommitmentController {
  constructor(private readonly service = new DocumentCommitmentService()) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals
      .documentCommitmentListQuery as DocumentCommitmentListQuery;
    const result = await this.service.list(query, canSeeDrafts(res));

    res.status(200).json({
      documentCommitments: result.documents.map(presentDocumentCommitment),
      pagination: result.pagination,
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const document = await this.service.getById(
      parseIdParam(req.params.documentId),
      canSeeDrafts(res),
    );

    res.status(200).json({
      documentCommitment: presentDocumentCommitment(document),
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const document = await this.service.create(
      req.body as CreateDocumentCommitmentInput,
      req.file,
      getAuthenticatedUser(req),
    );

    res.status(201).json({
      documentCommitment: presentDocumentCommitment(document),
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const document = await this.service.update(
      parseIdParam(req.params.documentId),
      req.body as UpdateDocumentCommitmentInput,
      req.file,
      getAuthenticatedUser(req),
    );

    res.status(200).json({
      documentCommitment: presentDocumentCommitment(document),
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(
      parseIdParam(req.params.documentId),
      getAuthenticatedUser(req),
    );
    res.status(204).end();
  };
}
