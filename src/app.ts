import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'node:path';
import { articleCategoryRouter } from './module/article/routes/article-category.routes.js';
import { articleRouter } from './module/article/routes/article.routes.js';
import { authRouter } from './module/auth/auth.routes.js';
import { boardMemberRouter } from './module/board_member/routes/board-member.routes.js';
import { clientRouter } from './module/client/routes/client.routes.js';
import { contentRouter } from './module/content/routes/content.routes.js';
import { divisionRouter } from './module/division/routes/division.routes.js';
import { documentCommitmentCategoryRouter } from './module/document_commitment/routes/document-commitment-category.routes.js';
import { documentCommitmentRouter } from './module/document_commitment/routes/document-commitment.routes.js';
import { divisionRouter } from './module/division/routes/division.routes.js';
import { documentationRouter } from './module/documentation/documentation.routes.js';
import { faqRouter } from './module/faq/routes/faq.routes.js';
import { inboxRouter } from './module/inbox/routes/inbox.routes.js';
import { languageRouter } from './module/language/routes/language.routes.js';
import { mediaRouter } from './module/media/routes/media.routes.js';
import { serviceRouter } from './module/service/routes/service.routes.js';
import { siteSettingRouter } from './module/site_setting/routes/site-setting.routes.js';
import { frontendOrigin } from './shared/config/session.js';
import { connectRedis, redisClient } from './shared/db/redis.js';
import { validateRequestOrigin } from './shared/middlewares/csrf.middleware.js';
import { errorHandler } from './shared/middlewares/error.middleware.js';
import { sessionMiddleware } from './shared/middlewares/session.middleware.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.set('trust proxy', 1);

app.use(
  '/public',
  cors(),
  express.static(path.resolve(process.cwd(), 'public'), {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath).toLowerCase() !== '.svg') return;

      // Second layer after upload sanitizing: SVG opened directly cannot run scripts.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);
// Before session middleware so browsing the docs does not create sessions.
app.use(documentationRouter);
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(validateRequestOrigin);
app.use('/auth', authRouter);
app.use(boardMemberRouter);
app.use(languageRouter);
app.use(articleRouter);
app.use(articleCategoryRouter);
app.use(mediaRouter);
app.use(contentRouter);
app.use(documentCommitmentCategoryRouter);
app.use(documentCommitmentRouter);
app.use(divisionRouter);
app.use(serviceRouter);
app.use(faqRouter);
app.use(clientRouter);
app.use(inboxRouter);
app.use(siteSettingRouter);

app.get('/health', (req: Request, res: Response) => {
  res.send({ message: 'OK' });
});

app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await connectRedis();
  } catch (error) {
    console.error('Unable to connect to Redis; server startup aborted.', error);
    redisClient.destroy();
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

void startServer();
