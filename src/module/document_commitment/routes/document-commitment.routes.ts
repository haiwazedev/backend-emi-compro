import { Router } from 'express';
import { createAuthMiddleware } from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { DocumentCommitmentController } from '../controllers/document-commitment.controller.js';
import { uploadDocumentCommitmentFile } from '../middlewares/document-commitment-upload.middleware.js';
import {
  createDocumentCommitmentBodySchema,
  documentCommitmentListQuerySchema,
  updateDocumentCommitmentBodySchema,
} from '../schemas/document-commitment.schema.js';

const controller = new DocumentCommitmentController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const documentCommitmentRouter = Router();

documentCommitmentRouter.get(
  '/document_commitments',
  validateQuery(
    documentCommitmentListQuerySchema,
    'documentCommitmentListQuery',
  ),
  controller.list,
);
documentCommitmentRouter.get(
  '/document_commitments/:documentId',
  controller.get,
);
documentCommitmentRouter.post(
  '/document_commitments',
  requireAuth,
  uploadDocumentCommitmentFile,
  validateBody(createDocumentCommitmentBodySchema),
  controller.create,
);
documentCommitmentRouter.put(
  '/document_commitments/:documentId',
  requireAuth,
  uploadDocumentCommitmentFile,
  validateBody(updateDocumentCommitmentBodySchema),
  controller.update,
);
documentCommitmentRouter.delete(
  '/document_commitments/:documentId',
  requireAuth,
  controller.delete,
);
