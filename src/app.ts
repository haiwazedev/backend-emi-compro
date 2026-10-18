import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'node:path';
import { activityLogRouter } from './module/activity_log/routes/activity-log.routes.js';
import { articleCategoryRouter } from './module/article/routes/article-category.routes.js';
import { articleRouter } from './module/article/routes/article.routes.js';
import { authRouter } from './module/auth/auth.routes.js';
import { boardMemberRouter } from './module/board_member/routes/board-member.routes.js';
import { clientRouter } from './module/client/routes/client.routes.js';
import { divisionRouter } from './module/division/routes/division.routes.js';
import { documentCommitmentCategoryRouter } from './module/document_commitment/routes/document-commitment-category.routes.js';
import { documentCommitmentRouter } from './module/document_commitment/routes/document-commitment.routes.js';
import { documentationRouter } from './module/documentation/documentation.routes.js';
import { faqRouter } from './module/faq/routes/faq.routes.js';
import { inboxSubmissionRateLimit } from './module/inbox/middlewares/inbox-submission-rate-limit.middleware.js';
import { inboxRouter } from './module/inbox/routes/inbox.routes.js';
import { languageRouter } from './module/language/routes/language.routes.js';
import { mediaRouter } from './module/media/routes/media.routes.js';
import { roleRouter } from './module/role/routes/role.routes.js';
import { serviceRouter } from './module/service/routes/service.routes.js';
import { siteContentRouter } from './module/site_content/routes/site-content.routes.js';
import { siteSettingRouter } from './module/site_setting/routes/site-setting.routes.js';
import { userRouter } from './module/user/routes/user.routes.js';
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
const frontendCors = cors({ origin: frontendOrigin, credentials: true });
const publicInboxCors = cors({ origin: '*' });
app.use((req, res, next) => {
  const isInboxSubmission = req.path === '/inboxes' && req.method === 'POST';
  const isInboxSubmissionPreflight =
    req.path === '/inboxes' &&
    req.method === 'OPTIONS' &&
    req.get('access-control-request-method')?.toUpperCase() === 'POST';

  (isInboxSubmission || isInboxSubmissionPreflight
    ? publicInboxCors
    : frontendCors)(req, res, next);
});
app.use(inboxSubmissionRateLimit);
app.use(express.json());
app.use(sessionMiddleware);
app.use(validateRequestOrigin);
app.use('/auth', authRouter);
app.use(boardMemberRouter);
app.use(languageRouter);
app.use(articleRouter);
app.use(articleCategoryRouter);
app.use(mediaRouter);
app.use(documentCommitmentCategoryRouter);
app.use(documentCommitmentRouter);
app.use(divisionRouter);
app.use(serviceRouter);
app.use(faqRouter);
app.use(clientRouter);
app.use(inboxRouter);
app.use(siteSettingRouter);
app.use(siteContentRouter);
app.use(activityLogRouter);
app.use(roleRouter);
app.use(userRouter);

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
