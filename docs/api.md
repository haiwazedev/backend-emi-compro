# API Reference

This document describes the API for frontend integration.

## Base URL and Requests

The default local base URL is `http://localhost:8000`. Replace it with the
server's deployed URL when integrating with another environment. The port can
be changed with the `PORT` environment variable.

Send JSON request bodies with the `Content-Type: application/json` header. Media
uploads use `multipart/form-data`.
Errors use this shape:

```json
{
  "message": "A human-readable error message."
}
```

The server requires `REDIS_URL`, `SESSION_SECRET`, and `FRONTEND_ORIGIN`. Use a
random session secret of at least 32 bytes. The configured frontend origin must
be an exact HTTP or HTTPS origin, such as `http://localhost:3000`. The server
does not start if it cannot connect to Redis.

## Browser Sessions

Registration and login create a server-side session in Redis and set the
host-only `pln_emi.sid` HttpOnly cookie. The cookie is `SameSite=Lax`, lasts
three hours, and is marked `Secure` in production. Its lifetime is fixed and is
not extended by activity. JavaScript cannot read the session cookie.

The frontend and API may use different origins on the same site. The API allows
credentialed browser requests only from the configured `FRONTEND_ORIGIN`. Use
`credentials: 'include'` in Fetch requests so the browser sends and receives the
session cookie. State-changing requests must include an `Origin` or `Referer`
that matches `FRONTEND_ORIGIN`; browsers add these headers automatically.
Bearer JWTs are no longer accepted. Sign in again to create a session.

For Fetch examples, define the base URL once:

```js
const API_BASE_URL = 'http://localhost:8000';
```

## Register

`POST /auth/register`

Create an account and start a session.

### Request body

| Field      | Type   | Rules                                                           |
| ---------- | ------ | --------------------------------------------------------------- |
| `name`     | string | Required; whitespace around the value is trimmed.               |
| `email`    | string | Required; must be a valid email. It is trimmed and lowercased.  |
| `password` | string | Required and non-empty. It is sent as provided and not trimmed. |

```json
{
  "name": "Ari Putra",
  "email": "ari@example.com",
  "password": "correct-horse-battery-staple"
}
```

### Success response — `201 Created`

The response sets the session cookie and returns:

```json
{
  "user": {
    "name": "Ari Putra",
    "email": "ari@example.com"
  }
}
```

### Errors

| Status                    | Message                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `400 Bad Request`         | `Name, email, and password are required.` for missing or empty fields; `Email must be valid.` for an invalid email. |
| `403 Forbidden`           | `Request origin is not allowed.` when `Origin`/`Referer` is missing or does not match the configured origin.        |
| `409 Conflict`            | `Email is already registered.`                                                                                      |
| `503 Service Unavailable` | `Session service is unavailable.` when Redis session storage fails.                                                 |

### Fetch example

```js
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Ari Putra',
    email: 'ari@example.com',
    password: 'correct-horse-battery-staple',
  }),
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);

const { user } = data;
```

### cURL example

```sh
curl -i -X POST http://localhost:8000/auth/register \
  -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ari Putra","email":"ari@example.com","password":"correct-horse-battery-staple"}' \
  -c cookies.txt
```

## Login

`POST /auth/login`

Authenticate an existing account and start a session.

| Field      | Type   | Rules                                                           |
| ---------- | ------ | --------------------------------------------------------------- |
| `email`    | string | Required; must be a valid email. It is trimmed and lowercased.  |
| `password` | string | Required and non-empty. It is sent as provided and not trimmed. |

The request body is:

```json
{
  "email": "ari@example.com",
  "password": "correct-horse-battery-staple"
}
```

The `200 OK` response sets the session cookie and returns the same
`{ "user": ... }` shape as registration.

### Errors

| Status                    | Message                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `400 Bad Request`         | `Email and password are required.` for missing or empty fields; `Email must be valid.` for an invalid email. |
| `401 Unauthorized`        | `Invalid email or password.`                                                                                 |
| `403 Forbidden`           | `Request origin is not allowed.` when `Origin`/`Referer` is missing or does not match the configured origin. |
| `503 Service Unavailable` | `Session service is unavailable.` when Redis session storage fails.                                          |

### Fetch example

```js
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'ari@example.com',
    password: 'correct-horse-battery-staple',
  }),
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);

const { user } = data;
```

### cURL example

```sh
curl -i -X POST http://localhost:8000/auth/login \
  -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"email":"ari@example.com","password":"correct-horse-battery-staple"}' \
  -c cookies.txt
```

## Get the Current User

`GET /auth/me`

Return the current user's name and email using the session cookie.

### Success response — `200 OK`

```json
{
  "user": {
    "name": "Ari Putra",
    "email": "ari@example.com"
  }
}
```

### Errors

| Status                    | Message                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `401 Unauthorized`        | `Authentication is required.` when no valid session exists or its user no longer exists. |
| `503 Service Unavailable` | `Session service is unavailable.` when Redis session storage fails.                      |

### Fetch example

```js
const response = await fetch(`${API_BASE_URL}/auth/me`, {
  credentials: 'include',
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);

const { user } = data;
```

### cURL example

```sh
curl http://localhost:8000/auth/me -b cookies.txt
```

## Logout

`POST /auth/logout`

Destroy the current Redis session and clear the cookie. The route is safe to
repeat and does not require an active session. Success returns `204 No Content`
with no response body.

### Errors

| Status                    | Message                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `403 Forbidden`           | `Request origin is not allowed.` when `Origin`/`Referer` is missing or does not match the configured origin. |
| `503 Service Unavailable` | `Session service is unavailable.` when Redis session storage fails.                                          |

### Fetch example

```js
const response = await fetch(`${API_BASE_URL}/auth/logout`, {
  method: 'POST',
  credentials: 'include',
});

if (!response.ok) {
  const data = await response.json();
  throw new Error(data.message);
}
```

### cURL example

```sh
curl -i -X POST http://localhost:8000/auth/logout \
  -H 'Origin: http://localhost:3000' \
  -b cookies.txt
```

## Content Blocks

Content reads are public. Updating a content row requires an authenticated
session and the configured frontend `Origin` or `Referer`, as described under
[Browser Sessions](#browser-sessions).

### List content

`GET /contents`

Returns all content rows, ordered by `page`, `block_key`, `block_type`, and
`sort_order`. The optional filters can be combined:

For example, filtering by page=home, block_key=statistic, and
block_type=statistic-item returns the ordered home statistics.

| Query parameter | Type   | Rules                     |
| --------------- | ------ | ------------------------- |
| `page`          | string | Optional page identifier. |
| `block_key`     | string | Optional block key.       |
| `block_type`    | string | Optional block type.      |

Example response:

```json
{
  "contents": [
    {
      "id": 1,
      "page": "home",
      "block_key": "statistic",
      "block_type": "statistic-item",
      "sort_order": 1,
      "data": {
        "label": "Customers",
        "number": "250",
        "description": "Across Indonesia"
      },
      "media_id": null,
      "created_at": "2026-10-10T10:30:00.000Z",
      "created_by": "Ari Putra",
      "updated_at": "2026-10-10T10:30:00.000Z",
      "updated_by": "Ari Putra"
    }
  ]
}
```

### Replace content lists

`PUT /contents`

The request body must be a non-empty JSON array. Each item selects an available
page/block combination and describes one content row. Non-sortable items are
upserted at `sort_order` 1.

For each sortable combination represented in the request, include its complete
desired list. Its `sort_order` values must be exactly `1..N`. The server deletes
the stored list for that combination and recreates it from the request. A
sortable combination absent from the request is left unchanged. Recreated rows
receive new IDs and create metadata. If a sortable item omits `media_id`, its
media link is cleared. For non-sortable upserts, an omitted `media_id` leaves an
existing link unchanged.

The complete request is validated before writing and applied in one database
transaction. If any item fails, the request is rejected and no changes are
applied. Item-specific error messages include the item’s zero-based array index.

| Field        | Type           | Rules                                                                                        |
| ------------ | -------------- | -------------------------------------------------------------------------------------------- |
| `page`       | string         | Required; must be an available page/block combination.                                       |
| `block_key`  | string         | Required; must match the selected combination.                                               |
| `block_type` | string         | Required; must match the selected combination.                                               |
| `sort_order` | number         | Required for sortable combinations; positive integer and contiguous from 1 within each list. |
| `data`       | object or null | Required object for data blocks; omitted or null for pictures.                               |
| `media_id`   | number or null | Optional; existing media ID, only for combinations that support media.                       |

Every data object must contain exactly the listed fields. Each value must be a
string.

| Page       | Block key          | Block type        | Sortable | Media | Data fields                      |
| ---------- | ------------------ | ----------------- | -------- | ----- | -------------------------------- |
| `home`     | `hero-carousel`    | `carousel-slide`  | Yes      | Yes   | `title_1`, `title_2`, `subtitle` |
| `home`     | `statistic`        | `statistic-item`  | Yes      | No    | `label`, `number`, `description` |
| `home`     | `teaser`           | `teaser-title`    | No       | No    | `title`                          |
| `home`     | `teaser`           | `cta-title`       | No       | No    | `title`                          |
| `home`     | `teaser`           | `teaser-content`  | No       | No    | `content`                        |
| `about-us` | `company-profile`  | `profile-content` | No       | No    | `content`                        |
| `about-us` | `company-profile`  | `company-picture` | No       | Yes   | None                             |
| `about-us` | `mission-vision`   | `vision`          | No       | No    | `content`                        |
| `about-us` | `mission-vision`   | `mission-item`    | Yes      | No    | `title`, `description`           |
| `about-us` | `history_timeline` | `timeline-item`   | Yes      | No    | `period`, `description`          |

Example request containing a complete two-item carousel list:

```json
[
  {
    "page": "home",
    "block_key": "hero-carousel",
    "block_type": "carousel-slide",
    "sort_order": 1,
    "data": {
      "title_1": "First slide",
      "title_2": "First highlight",
      "subtitle": "First description"
    },
    "media_id": 12
  },
  {
    "page": "home",
    "block_key": "hero-carousel",
    "block_type": "carousel-slide",
    "sort_order": 2,
    "data": {
      "title_1": "Second slide",
      "title_2": "Second highlight",
      "subtitle": "Second description"
    },
    "media_id": 13
  }
]
```

A successful request returns `200 OK` with `{ "contents": [...] }` in request
order. Recreated rows set `created_by` and `updated_by` to the authenticated
user's name, and `updated_at` defaults to the current time. Updating an existing
non-sortable row refreshes `updated_at` and `updated_by`. Send `null` for
`media_id` to clear a non-sortable row's reference. Any existing media type is
accepted for supported combinations.

Invalid combinations, data fields, sort order, duplicate rows, or media
references return `400 Bad Request`. Missing authentication returns `401
Unauthorized`; a missing or disallowed request origin returns `403 Forbidden`.

## Articles

Article reads are public. Creating, updating, and deleting articles require an
authenticated session. State-changing requests must include the configured
frontend `Origin` or `Referer` as described under [Browser Sessions](#browser-sessions).

### List articles

`GET /articles`

Returns a page of articles with their related category and primary photo media.
Results are sorted by `created_at` descending by default, with `id` as a stable
tie-breaker.

| Query parameter       | Type   | Rules                                                   |
| --------------------- | ------ | ------------------------------------------------------- |
| `page`                | number | Optional, 1-based; default `1`.                         |
| `limit`               | number | Optional; default `20`, minimum `1`, maximum `100`.     |
| `search`              | string | Optional, case-insensitive substring search in `title`. |
| `article_category_id` | number | Optional positive category ID filter.                   |
| `status`              | string | Optional; `DRAFT` or `PUBLISHED`.                       |
| `sort_by`             | string | Optional; must be `created_at`, default `created_at`.   |
| `sort_order`          | string | Optional; `asc` or `desc`, default `desc`.              |

Provided filters are combined using AND. Invalid query values return `400 Bad
Request`.

```json
{
  "articles": [
    {
      "id": 12,
      "article_category_id": 3,
      "title": "New service center opens",
      "slug": "new-service-center-opens",
      "summary": "A short summary.",
      "content": "Full article content.",
      "issue_date": "2026-10-10",
      "press_release_number": null,
      "primary_photo": 18,
      "primary_photo_url": "/public/media/company-news.jpg",
      "cp_name": null,
      "cp_role": null,
      "cp_phone_number": null,
      "cp_email": null,
      "status": "DRAFT",
      "created_at": "2026-10-10T10:30:00.000Z",
      "created_by": "Ari Putra",
      "updated_at": null,
      "updated_by": null,
      "article_category": {
        "id": 3,
        "name": "Company News",
        "slug": "company-news"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Get, create, update, and delete an article

- `GET /articles/:articleId` returns `{ "article": ... }` with `200 OK`.
- `POST /articles` creates an article and returns `{ "article": ... }` with
  `201 Created`.
- `PUT /articles/:articleId` partially updates an article and returns
  `{ "article": ... }` with `200 OK`. Omitted fields remain unchanged. Send
  `null` for `primary_photo` to clear its media relation.
- `DELETE /articles/:articleId` deletes an article and returns `204 No Content`.

Article POST and PUT bodies use JSON.

| Field                  | Type           | Rules                                                               |
| ---------------------- | -------------- | ------------------------------------------------------------------- |
| `article_category_id`  | number         | Required on create; positive ID of an existing category.            |
| `title`                | string         | Required on create; maximum 120 characters.                         |
| `slug`                 | string         | Required on create; maximum 255 characters; unique.                 |
| `summary`              | string         | Required on create.                                                 |
| `content`              | string         | Required on create.                                                 |
| `primary_photo`        | number or null | Picture media ID; required on create; optional or `null` on update. |
| `issue_date`           | date or null   | Optional; `YYYY-MM-DD`.                                             |
| `press_release_number` | string or null | Optional; maximum 255 characters.                                   |
| `cp_name`              | string or null | Optional; maximum 100 characters.                                   |
| `cp_role`              | string or null | Optional; maximum 100 characters.                                   |
| `cp_phone_number`      | string or null | Optional; maximum 100 characters.                                   |
| `cp_email`             | string or null | Optional; maximum 100 characters.                                   |
| `status`               | string         | Optional; `DRAFT` or `PUBLISHED`; defaults to `DRAFT`.              |

The referenced media record must exist and have type `PICTURE`. Article
responses include its ID in `primary_photo` and its public path in
`primary_photo_url`. Both response fields are `null` when no media is linked,
including after the media record is deleted.

On create, omitted nullable text/date fields are stored as `null`. On update,
omit a field to keep its current value; send `null` to clear nullable fields.
The authenticated user's name is stored in `created_by`; updates set
`updated_by` and `updated_at`.

Example request:

```js
const response = await fetch(`${API_BASE_URL}/articles`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    article_category_id: 3,
    title: 'New service center opens',
    slug: 'new-service-center-opens',
    summary: 'A short summary.',
    content: 'Full article content.',
    issue_date: '2026-10-10',
    primary_photo: 18,
  }),
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

## Media

Media list and detail reads are public. Upload and delete requests require an
authenticated session and the configured frontend `Origin` or `Referer`.
Uploaded files are publicly available under `/public/media/`.

### Upload media

`POST /media` accepts `multipart/form-data` with a `type` field (`PICTURE` or
`DOCUMENT`) and a file field named `file`. The original filename is preserved
on disk and must not already exist. Its URL-encoded form is stored in `path`.

| Type       | Accepted extensions  | Maximum size |
| ---------- | -------------------- | ------------ |
| `PICTURE`  | `png`, `jpg`, `jpeg` | 2 MiB        |
| `DOCUMENT` | `pdf`                | 5 MiB        |

The server checks file content against the extension. Picture metadata contains
its pixel `width` and `height`; document metadata is `null`. `size` is the file
size rounded up to an integer number of KB (1024 bytes). `created_by` is the authenticated
user's name.

A successful upload returns `201 Created`:

```json
{
  "media": {
    "id": 18,
    "filename": "company-news.jpg",
    "path": "/public/media/company-news.jpg",
    "extension": "jpg",
    "type": "PICTURE",
    "size": 184,
    "metadata": { "width": 1600, "height": 900 },
    "created_by": "Ari Putra",
    "created_at": "2026-10-10T10:30:00.000Z"
  }
}
```

Example browser request:

```js
const formData = new FormData();
formData.append('type', 'PICTURE');
formData.append('file', imageFile);

const response = await fetch(`${API_BASE_URL}/media`, {
  method: 'POST',
  credentials: 'include',
  body: formData,
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

Do not set the multipart `Content-Type` header manually; the browser adds its
boundary.

### List and get media

- `GET /media` returns `{ "media": [...] }` with `200 OK`.
- `GET /media/:mediaId` returns `{ "media": ... }` with `200 OK`.

`GET /media` is unpaginated and accepts these optional query parameters:

| Query parameter | Type   | Rules                                           |
| --------------- | ------ | ----------------------------------------------- |
| `type`          | string | `PICTURE` or `DOCUMENT`.                        |
| `sort_by`       | string | Must be `created_at`; defaults to `created_at`. |
| `sort_order`    | string | `asc` or `desc`; defaults to `desc`.            |

Results use `id` as a stable tie-breaker in the selected sort direction.

### Delete media

- `DELETE /media/:mediaId` deletes one record and returns `204 No Content`.
- `POST /media/bulk_delete` accepts a JSON `ids` array of positive integers,
  deletes matching records in a database transaction, and returns the number
  removed. Missing IDs are ignored.

```json
{
  "ids": [18, 19, 20]
}
```

The bulk delete response is:

```json
{
  "deleted_count": 3
}
```

Deleting media also clears any Article `primary_photo` relation that references
it. The stored file is removed after the database deletion commits.

## Article Categories

Category reads are public. Creating, updating, and deleting categories require
an authenticated session. Category requests use JSON.

- `GET /article_categories` returns `{ "articleCategories": [...] }` with
  `200 OK`.
- `GET /article_categories/:articleCategoryId` returns
  `{ "articleCategory": ... }` with `200 OK`.
- `POST /article_categories` creates a category and returns
  `{ "articleCategory": ... }` with `201 Created`.
- `PUT /article_categories/:articleCategoryId` partially updates a category
  and returns `{ "articleCategory": ... }` with `200 OK`.
- `DELETE /article_categories/:articleCategoryId` returns `204 No Content`.
  Deleting a category also deletes its articles; media records remain in the
  media library.

Category create and update bodies accept `name` (up to 100 characters) and
`slug` (up to 100 characters, unique). Both fields are required on create;
omitted fields remain unchanged on update.

```json
{
  "name": "Company News",
  "slug": "company-news"
}
```

## Public Static Assets

Files in the project `public/` directory are served without authentication at
the matching `/public/*` path and allow cross-origin reads. For example,
`public/media/company-news.jpg` is available at
`http://localhost:8000/public/media/company-news.jpg`.

## Article, Category, and Media Errors

| Status                  | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `400 Bad Request`       | Invalid ID, request field, query value, category reference, media reference, or file type. |
| `401 Unauthorized`      | A write request does not have a valid session.                                             |
| `403 Forbidden`         | A write request has a missing or disallowed `Origin`/`Referer`.                            |
| `404 Not Found`         | The requested article, category, or media record does not exist.                           |
| `409 Conflict`          | Article/category slug or media filename is already in use.                                 |
| `413 Payload Too Large` | An uploaded file exceeds the limit for its media type.                                     |

## Health Check

`GET /health` does not require authentication and returns `200 OK`:

```json
{
  "message": "OK"
}
```

## Common Errors

Malformed JSON returns `400 Bad Request` with:

```json
{
  "message": "Request body must contain valid JSON."
}
```

Unexpected server errors return `500 Internal Server Error` with:

```json
{
  "message": "Internal server error."
}
```
