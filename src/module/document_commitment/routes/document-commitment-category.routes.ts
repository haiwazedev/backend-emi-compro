import { Router } from 'express';
import {
  createAuthMiddleware,
  requireDelete,
  requireWrite,
} from '../../auth/auth.middleware.js';
import { AuthService } from '../../auth/auth.service.js';
import { validateBody } from '../../../shared/middlewares/validate-body.middleware.js';
import { DocumentCommitmentCategoryController } from '../controllers/document-commitment-category.controller.js';
import {
  createDocumentCommitmentCategoryBodySchema,
  updateDocumentCommitmentCategoryBodySchema,
} from '../schemas/document-commitment-category.schema.js';

const controller = new DocumentCommitmentCategoryController();
const authService = new AuthService();
const requireAuth = createAuthMiddleware(authService);

export const documentCommitmentCategoryRouter = Router();

documentCommitmentCategoryRouter.get(
  '/document_commitment_categories',
  controller.list,
);
documentCommitmentCategoryRouter.get(
  '/document_commitment_categories/:categoryId',
  controller.get,
);
documentCommitmentCategoryRouter.post(
  '/document_commitment_categories',
  requireAuth,
  requireWrite,
  validateBody(createDocumentCommitmentCategoryBodySchema),
  controller.create,
);
documentCommitmentCategoryRouter.put(
  '/document_commitment_categories/:categoryId',
  requireAuth,
  requireWrite,
  validateBody(updateDocumentCommitmentCategoryBodySchema),
  controller.update,
);
documentCommitmentCategoryRouter.delete(
  '/document_commitment_categories/:categoryId',
  requireAuth,
  requireDelete,
  controller.delete,
);
