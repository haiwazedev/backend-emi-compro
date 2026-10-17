import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi.js';

export const documentationRouter = Router();

documentationRouter.get('/documentation/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
documentationRouter.use(
  '/documentation',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);
