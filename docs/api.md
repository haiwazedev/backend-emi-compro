# API Reference

This document describes the API for frontend integration.

## Base URL and Requests

The default local base URL is `http://localhost:8000`. Replace it with the
server's deployed URL when integrating with another environment. The port can
be changed with the `PORT` environment variable.

Send JSON request bodies with the `Content-Type: application/json` header. Article
create and update requests use `multipart/form-data` for the photo upload.
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

## Articles

Article reads are public. Creating, updating, and deleting articles require an
authenticated session. State-changing requests must include the configured
frontend `Origin` or `Referer` as described under [Browser Sessions](#browser-sessions).

### List articles

`GET /articles`

Returns a page of articles with the related category in each result. Results
are sorted by `created_at` descending by default, with `id` as a stable
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
      "primary_photo_url": "/public/articles/12.webp",
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
  `{ "article": ... }` with `200 OK`. Omitted fields remain unchanged. Empty
  values clear nullable fields; omit `primary_photo` to keep the current photo.
- `DELETE /articles/:articleId` deletes an article and returns `204 No Content`.

Article POST and PUT bodies use `multipart/form-data`. Send article values as
form fields and attach the image under `primary_photo`.

| Field                  | Type   | Rules                                                    |
| ---------------------- | ------ | -------------------------------------------------------- |
| `article_category_id`  | number | Required on create; positive ID of an existing category. |
| `title`                | string | Required on create; maximum 120 characters.              |
| `slug`                 | string | Required on create; maximum 255 characters; unique.      |
| `summary`              | string | Required on create.                                      |
| `content`              | string | Required on create.                                      |
| `primary_photo`        | file   | Required on create; optional on update; max 2 MiB.       |
| `issue_date`           | date   | Optional; `YYYY-MM-DD`.                                  |
| `press_release_number` | string | Optional; maximum 255 characters.                        |
| `cp_name`              | string | Optional; maximum 100 characters.                        |
| `cp_role`              | string | Optional; maximum 100 characters.                        |
| `cp_phone_number`      | string | Optional; maximum 100 characters.                        |
| `cp_email`             | string | Optional; maximum 100 characters.                        |
| `status`               | string | Optional; `DRAFT` or `PUBLISHED`; defaults to `DRAFT`.   |

On create, omitted nullable text/date fields are stored as `null`. On update,
omit a field to keep its current value; send an empty value to clear a nullable
field. The authenticated user's name is stored in `created_by`; updates set
`updated_by` and `updated_at`.

Only PNG, JPG, JPEG, and WebP photos are accepted. The server checks the file
extension, media type, and image signature. Photos are stored as
`public/articles/{articleId}.{extension}` and their public path is returned in
`primary_photo_url`, for example `/public/articles/12.webp`.

Example browser request:

```js
const formData = new FormData();
formData.append('article_category_id', '3');
formData.append('title', 'New service center opens');
formData.append('slug', 'new-service-center-opens');
formData.append('summary', 'A short summary.');
formData.append('content', 'Full article content.');
formData.append('issue_date', '2026-10-10');
formData.append('primary_photo', photoFile);

const response = await fetch(`${API_BASE_URL}/articles`, {
  method: 'POST',
  credentials: 'include',
  body: formData,
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

Do not set the multipart `Content-Type` header manually; the browser adds its
boundary.

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
  Deleting a category also deletes its articles and their stored photos.

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
`public/articles/12.webp` is available at
`http://localhost:8000/public/articles/12.webp`.

## Article and Category Errors

| Status                  | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `400 Bad Request`       | Invalid ID, request field, query value, category reference, or image type. |
| `401 Unauthorized`      | A write request does not have a valid session.                             |
| `403 Forbidden`         | A write request has a missing or disallowed `Origin`/`Referer`.            |
| `404 Not Found`         | The requested article or category does not exist.                          |
| `409 Conflict`          | Article or category slug is already in use.                                |
| `413 Payload Too Large` | The uploaded photo exceeds 2 MiB.                                          |

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
