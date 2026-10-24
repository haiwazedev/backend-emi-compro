import { Router } from 'express';
import {
  createAuthMiddleware,
  includeDrafts,
  forceDraftUnlessPublisher,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { validateQuery } from '../../../shared/middlewares/validate-query.middleware.js';
import { bulkDeleteBodySchema } from '../../../shared/schemas/common.schema.js';
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
documentCommitmentRouter.get(
  '/admin/document_commitments',
  requireAuth,
  includeDrafts,
  validateQuery(
    documentCommitmentListQuerySchema,
    'documentCommitmentListQuery',
  ),
  controller.list,
);
documentCommitmentRouter.get(
  '/admin/document_commitments/:documentId',
  requireAuth,
  includeDrafts,
  controller.get,
);
documentCommitmentRouter.get(
  '/admin/document_commitments/:documentId/file',
  requireAuth,
  controller.file,
);
documentCommitmentRouter.post(
  '/document_commitments',
  requireAuth,
  requireWrite,
  uploadDocumentCommitmentFile,
  validateBody(createDocumentCommitmentBodySchema),
  forceDraftUnlessPublisher,
  controller.create,
);
documentCommitmentRouter.put(
  '/document_commitments/:documentId',
  requireAuth,
  requireWrite,
  uploadDocumentCommitmentFile,
  validateBody(updateDocumentCommitmentBodySchema),
  forceDraftUnlessPublisher,
  controller.update,
);
documentCommitmentRouter.delete(
  '/document_commitments/:documentId',
  requireAuth,
  requireDelete,
  controller.delete,
);
documentCommitmentRouter.post(
  '/document_commitments/bulk_delete',
  requireAuth,
  requireDelete,
  validateBody(bulkDeleteBodySchema),
  controller.bulkDelete,
);
