import { z } from 'zod';
import {
  createArticleCategoryBodySchema,
  updateArticleCategoryBodySchema,
} from '../article/schemas/article-category.schema.js';
import {
  articleListQuerySchema,
  createArticleBodySchema,
  updateArticleBodySchema,
} from '../article/schemas/article.schema.js';
import { loginBodySchema, registerBodySchema } from '../auth/auth.schemas.js';
import {
  createBoardMemberTypeBodySchema,
  updateBoardMemberTypeBodySchema,
} from '../board_member/schemas/board-member-type.schema.js';
import {
  boardMemberListQuerySchema,
  createBoardMemberBodySchema,
  updateBoardMemberBodySchema,
} from '../board_member/schemas/board-member.schema.js';
import {
  createClientBodySchema,
  reorderClientsBodySchema,
  updateClientBodySchema,
} from '../client/schemas/client.schema.js';
import {
  contentListQuerySchema,
  upsertContentsBodySchema,
} from '../content/schemas/content.schema.js';
import {
  createDivisionBodySchema,
  divisionListQuerySchema,
  reorderDivisionsBodySchema,
  updateDivisionBodySchema,
} from '../division/schemas/division.schema.js';
import {
  createDocumentCommitmentCategoryBodySchema,
  updateDocumentCommitmentCategoryBodySchema,
} from '../document_commitment/schemas/document-commitment-category.schema.js';
import {
  createDocumentCommitmentBodySchema,
  documentCommitmentListQuerySchema,
  updateDocumentCommitmentBodySchema,
} from '../document_commitment/schemas/document-commitment.schema.js';
import {
  createFaqBodySchema,
  faqListQuerySchema,
  reorderFaqsBodySchema,
  updateFaqBodySchema,
} from '../faq/schemas/faq.schema.js';
import {
  createInboxBodySchema,
  inboxListQuerySchema,
  updateInboxBodySchema,
} from '../inbox/schemas/inbox.schema.js';
import {
  bulkDeleteMediaBodySchema,
  mediaListQuerySchema,
  uploadMediaBodySchema,
} from '../media/schemas/media.schema.js';
import {
  createServiceBodySchema,
  reorderServicesBodySchema,
  updateServiceBodySchema,
} from '../service/schemas/service.schema.js';
import {
  saveSiteSettingBodySchema,
  siteSettingQuerySchema,
} from '../site_setting/schemas/site-setting.schema.js';
import { sessionCookieName } from '../../shared/config/session.js';

type Operation = {
  tag: string;
  summary: string;
  auth?: boolean;
  status?: 200 | 201 | 204;
  query?: z.ZodType;
  body?: z.ZodType;
  // Multipart routes: form fields come from `body`, files are listed here.
  files?: Record<string, 'single' | 'multiple'>;
  // Site settings sends its JSON payload as a single "data" form field.
  bodyAsDataField?: boolean;
};

type Routes = Record<string, Partial<Record<Method, Operation>>>;
type Method = 'get' | 'post' | 'put' | 'delete';

const toSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

const routes: Routes = {
  '/auth/register': {
    post: {
      tag: 'Auth',
      summary: 'Register a user',
      status: 201,
      body: registerBodySchema,
    },
  },
  '/auth/login': {
    post: { tag: 'Auth', summary: 'Log in', body: loginBodySchema },
  },
  '/auth/me': {
    get: { tag: 'Auth', summary: 'Get the current user', auth: true },
  },
  '/auth/logout': { post: { tag: 'Auth', summary: 'Log out', status: 204 } },

  '/languages': { get: { tag: 'Languages', summary: 'List languages' } },

  '/contents': {
    get: {
      tag: 'Contents',
      summary: 'List content blocks',
      query: contentListQuerySchema,
    },
    put: {
      tag: 'Contents',
      summary: 'Replace content lists',
      auth: true,
      body: upsertContentsBodySchema,
    },
  },

  '/article_categories': {
    get: { tag: 'Article categories', summary: 'List article categories' },
    post: {
      tag: 'Article categories',
      summary: 'Create an article category',
      auth: true,
      status: 201,
      body: createArticleCategoryBodySchema,
    },
  },
  '/article_categories/{articleCategoryId}': {
    get: { tag: 'Article categories', summary: 'Get an article category' },
    put: {
      tag: 'Article categories',
      summary: 'Update an article category',
      auth: true,
      body: updateArticleCategoryBodySchema,
    },
    delete: {
      tag: 'Article categories',
      summary: 'Delete an article category',
      auth: true,
      status: 204,
    },
  },

  '/articles': {
    get: {
      tag: 'Articles',
      summary: 'List articles',
      query: articleListQuerySchema,
    },
    post: {
      tag: 'Articles',
      summary: 'Create an article',
      auth: true,
      status: 201,
      body: createArticleBodySchema,
    },
  },
  '/articles/slug/{slug}': {
    get: { tag: 'Articles', summary: 'Get a published article by slug' },
  },
  '/articles/{articleId}': {
    get: { tag: 'Articles', summary: 'Get an article' },
    put: {
      tag: 'Articles',
      summary: 'Update an article',
      auth: true,
      body: updateArticleBodySchema,
    },
    delete: {
      tag: 'Articles',
      summary: 'Delete an article',
      auth: true,
      status: 204,
    },
  },

  '/media': {
    get: { tag: 'Media', summary: 'List media', query: mediaListQuerySchema },
    post: {
      tag: 'Media',
      summary: 'Upload a media file',
      auth: true,
      status: 201,
      body: uploadMediaBodySchema,
      files: { file: 'single' },
    },
  },
  '/media/bulk_delete': {
    post: {
      tag: 'Media',
      summary: 'Delete several media files',
      auth: true,
      body: bulkDeleteMediaBodySchema,
    },
  },
  '/media/{mediaId}': {
    get: { tag: 'Media', summary: 'Get a media file' },
    delete: {
      tag: 'Media',
      summary: 'Delete a media file',
      auth: true,
      status: 204,
    },
  },

  '/board_member_types': {
    get: { tag: 'Board members', summary: 'List board member types' },
    post: {
      tag: 'Board members',
      summary: 'Create a board member type',
      auth: true,
      status: 201,
      body: createBoardMemberTypeBodySchema,
    },
  },
  '/board_member_types/{typeId}': {
    get: { tag: 'Board members', summary: 'Get a board member type' },
    put: {
      tag: 'Board members',
      summary: 'Update a board member type',
      auth: true,
      body: updateBoardMemberTypeBodySchema,
    },
    delete: {
      tag: 'Board members',
      summary: 'Delete a board member type',
      auth: true,
      status: 204,
    },
  },
  '/board_members': {
    get: {
      tag: 'Board members',
      summary: 'List board members',
      query: boardMemberListQuerySchema,
    },
    post: {
      tag: 'Board members',
      summary: 'Create a board member',
      auth: true,
      status: 201,
      body: createBoardMemberBodySchema,
      files: { photo: 'single' },
    },
  },
  '/board_members/{memberId}': {
    get: { tag: 'Board members', summary: 'Get a board member' },
    put: {
      tag: 'Board members',
      summary: 'Update a board member',
      auth: true,
      body: updateBoardMemberBodySchema,
      files: { photo: 'single' },
    },
    delete: {
      tag: 'Board members',
      summary: 'Delete a board member',
      auth: true,
      status: 204,
    },
  },

  '/document_commitment_categories': {
    get: {
      tag: 'Document commitments',
      summary: 'List document commitment categories',
    },
    post: {
      tag: 'Document commitments',
      summary: 'Create a document commitment category',
      auth: true,
      status: 201,
      body: createDocumentCommitmentCategoryBodySchema,
    },
  },
  '/document_commitment_categories/{categoryId}': {
    get: {
      tag: 'Document commitments',
      summary: 'Get a document commitment category',
    },
    put: {
      tag: 'Document commitments',
      summary: 'Update a document commitment category',
      auth: true,
      body: updateDocumentCommitmentCategoryBodySchema,
    },
    delete: {
      tag: 'Document commitments',
      summary: 'Delete a document commitment category',
      auth: true,
      status: 204,
    },
  },
  '/document_commitments': {
    get: {
      tag: 'Document commitments',
      summary: 'List document commitments',
      query: documentCommitmentListQuerySchema,
    },
    post: {
      tag: 'Document commitments',
      summary: 'Create a document commitment',
      auth: true,
      status: 201,
      body: createDocumentCommitmentBodySchema,
      files: { file: 'single' },
    },
  },
  '/document_commitments/{documentId}': {
    get: { tag: 'Document commitments', summary: 'Get a document commitment' },
    put: {
      tag: 'Document commitments',
      summary: 'Update a document commitment',
      auth: true,
      body: updateDocumentCommitmentBodySchema,
      files: { file: 'single' },
    },
    delete: {
      tag: 'Document commitments',
      summary: 'Delete a document commitment',
      auth: true,
      status: 204,
    },
  },

  '/divisions': {
    get: {
      tag: 'Divisions',
      summary: 'List divisions',
      query: divisionListQuerySchema,
    },
    post: {
      tag: 'Divisions',
      summary: 'Create a division',
      auth: true,
      status: 201,
      body: createDivisionBodySchema,
    },
  },
  '/divisions/reorder': {
    post: {
      tag: 'Divisions',
      summary: 'Reorder divisions',
      auth: true,
      body: reorderDivisionsBodySchema,
    },
  },
  '/divisions/{divisionId}': {
    get: { tag: 'Divisions', summary: 'Get a division' },
    put: {
      tag: 'Divisions',
      summary: 'Update a division',
      auth: true,
      body: updateDivisionBodySchema,
    },
    delete: {
      tag: 'Divisions',
      summary: 'Delete a division',
      auth: true,
      status: 204,
    },
  },

  '/services': {
    get: { tag: 'Services', summary: 'List services' },
    post: {
      tag: 'Services',
      summary: 'Create a service',
      auth: true,
      status: 201,
      body: createServiceBodySchema,
    },
  },
  '/services/reorder': {
    post: {
      tag: 'Services',
      summary: 'Reorder services',
      auth: true,
      body: reorderServicesBodySchema,
    },
  },
  '/services/{serviceId}': {
    get: { tag: 'Services', summary: 'Get a service' },
    put: {
      tag: 'Services',
      summary: 'Update a service',
      auth: true,
      body: updateServiceBodySchema,
    },
    delete: {
      tag: 'Services',
      summary: 'Delete a service',
      auth: true,
      status: 204,
    },
  },

  '/faqs': {
    get: { tag: 'FAQs', summary: 'List FAQs', query: faqListQuerySchema },
    post: {
      tag: 'FAQs',
      summary: 'Create an FAQ',
      auth: true,
      status: 201,
      body: createFaqBodySchema,
    },
  },
  '/faqs/reorder': {
    post: {
      tag: 'FAQs',
      summary: 'Reorder FAQs',
      auth: true,
      body: reorderFaqsBodySchema,
    },
  },
  '/faqs/{faqId}': {
    get: { tag: 'FAQs', summary: 'Get an FAQ' },
    put: {
      tag: 'FAQs',
      summary: 'Update an FAQ',
      auth: true,
      body: updateFaqBodySchema,
    },
    delete: {
      tag: 'FAQs',
      summary: 'Delete an FAQ',
      auth: true,
      status: 204,
    },
  },

  '/clients': {
    get: { tag: 'Clients', summary: 'List clients' },
    post: {
      tag: 'Clients',
      summary: 'Create a client',
      auth: true,
      status: 201,
      body: createClientBodySchema,
      files: { logo: 'single' },
    },
  },
  '/clients/reorder': {
    post: {
      tag: 'Clients',
      summary: 'Reorder clients',
      auth: true,
      body: reorderClientsBodySchema,
    },
  },
  '/clients/{clientId}': {
    get: { tag: 'Clients', summary: 'Get a client' },
    put: {
      tag: 'Clients',
      summary: 'Update a client',
      auth: true,
      body: updateClientBodySchema,
      files: { logo: 'single' },
    },
    delete: {
      tag: 'Clients',
      summary: 'Delete a client',
      auth: true,
      status: 204,
    },
  },

  '/inbox-subjects': { get: { tag: 'Inbox', summary: 'List inbox subjects' } },
  '/inboxes': {
    get: {
      tag: 'Inbox',
      summary: 'List inbox messages',
      auth: true,
      query: inboxListQuerySchema,
    },
    post: {
      tag: 'Inbox',
      summary: 'Send a contact message',
      status: 201,
      body: createInboxBodySchema,
    },
  },
  '/inboxes/counts': {
    get: { tag: 'Inbox', summary: 'Count inbox messages', auth: true },
  },
  '/inboxes/read-all': {
    post: { tag: 'Inbox', summary: 'Mark all messages read', auth: true },
  },
  '/inboxes/{inboxId}': {
    put: {
      tag: 'Inbox',
      summary: 'Update an inbox message',
      auth: true,
      body: updateInboxBodySchema,
    },
    delete: {
      tag: 'Inbox',
      summary: 'Delete an inbox message',
      auth: true,
      status: 204,
    },
  },

  '/site_settings': {
    get: {
      tag: 'Site settings',
      summary: 'Get site settings',
      query: siteSettingQuerySchema,
    },
    put: {
      tag: 'Site settings',
      summary: 'Save site settings',
      auth: true,
      body: saveSiteSettingBodySchema,
      bodyAsDataField: true,
      files: {
        danantara_logo: 'single',
        pln_logo: 'single',
        social_icons: 'multiple',
      },
    },
  },

  '/health': { get: { tag: 'Health', summary: 'Health check' } },
};

function buildOperation(path: string, operation: Operation) {
  const pathParameters = [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    // `...Id` params are positive integers; others (e.g. `slug`) are strings.
    schema: name.endsWith('Id')
      ? { type: 'integer', minimum: 1 }
      : { type: 'string' },
  }));
  const status = operation.status ?? 200;

  return {
    tags: [operation.tag],
    summary: operation.summary,
    ...(operation.auth && { security: [{ sessionCookie: [] }] }),
    parameters: [...pathParameters, ...buildQueryParameters(operation.query)],
    ...(operation.body && { requestBody: buildRequestBody(operation) }),
    responses: {
      [status]: {
        description: status === 204 ? 'No content' : 'Success',
        ...(status !== 204 && {
          content: { 'application/json': { schema: { type: 'object' } } },
        }),
      },
      default: {
        description: 'Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  };
}

function buildQueryParameters(query: z.ZodType | undefined) {
  if (!query) return [];

  const { properties = {}, required = [] } = toSchema(query) as {
    properties?: Record<string, object>;
    required?: string[];
  };

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: 'query',
    // Defaulted fields are listed as required in input mode, but may be omitted.
    required: required.includes(name) && !('default' in schema),
    schema,
  }));
}

function buildRequestBody({ body, files, bodyAsDataField }: Operation) {
  const schema = toSchema(body!);

  if (!files) {
    return { required: true, content: { 'application/json': { schema } } };
  }

  const fileProperties = Object.fromEntries(
    Object.entries(files).map(([name, count]) => [
      name,
      count === 'single'
        ? { type: 'string', format: 'binary' }
        : { type: 'array', items: { type: 'string', format: 'binary' } },
    ]),
  );
  const formSchema = bodyAsDataField
    ? {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'string',
            description: `JSON string matching: ${JSON.stringify(schema)}`,
          },
          ...fileProperties,
        },
      }
    : {
        ...schema,
        properties: { ...schema.properties, ...fileProperties },
      };

  return {
    required: true,
    content: { 'multipart/form-data': { schema: formSchema } },
  };
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'PLN EMI API',
    version: '1.0.0',
    description:
      'Request schemas are generated from the server validation rules. See docs/api.md for response shapes and examples.',
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: sessionCookieName },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string' } },
      },
    },
  },
  paths: Object.fromEntries(
    Object.entries(routes).map(([path, operations]) => [
      path,
      Object.fromEntries(
        Object.entries(operations).map(([method, operation]) => [
          method,
          buildOperation(path, operation),
        ]),
      ),
    ]),
  ),
};
