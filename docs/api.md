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

## Swagger

Interactive API documentation is served at `GET /documentation`, and the raw
OpenAPI 3.1 document at `GET /documentation/openapi.json`. Request bodies and
query parameters are generated from the server validation schemas. Response
shapes and examples are documented in this file.

"Try it out" works for public `GET` routes. Write routes reject requests whose
origin is not `FRONTEND_ORIGIN`, so call them from the frontend instead.

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

## Site Contents

Per-language content for the Beranda (`home`) and Tentang Kami (`about-us`)
pages.

Each block (`page`, `block_key`, `block_type`) is a `site_contents` header row,
created on its first save. Its items live in `site_content_items`, one set per
language. Nothing is shared across languages, including pictures. Media blocks
store a picked media file's `path` in `data.media_filepath`.

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
| `about-us` | `history_timeline` | `timeline-item`   | Yes      | No    | `period`, `title`, `description` |

Reads are public. Saving requires an authenticated session and the configured
frontend `Origin` or `Referer`, as described under
[Browser Sessions](#browser-sessions).

### List site contents

`GET /site_contents?page=home&language_id=en`

| Query parameter | Type   | Rules                                                              |
| --------------- | ------ | ------------------------------------------------------------------ |
| `page`          | string | Required; `home` or `about-us`.                                    |
| `language_id`   | string | Optional active language code, case-insensitive. Defaults to `id`. |

Items are ordered by `block_key`, `block_type`, then `sort_order`. A language
without saved items returns an empty `items` array; there is no fallback to
Bahasa Indonesia. An unknown or inactive language returns `400 Bad Request`.

```json
{
  "site_contents": {
    "language_id": "en",
    "items": [
      {
        "id": 7,
        "site_content_id": 1,
        "page": "home",
        "block_key": "hero-carousel",
        "block_type": "carousel-slide",
        "sort_order": 1,
        "data": {
          "title_1": "First slide",
          "title_2": "First highlight",
          "subtitle": "First description",
          "media_filepath": "/public/media/slide-1.webp"
        },
        "created_at": "2026-10-18T10:30:00.000Z",
        "created_by": "Ari Putra",
        "updated_at": null,
        "updated_by": "Ari Putra"
      }
    ]
  }
}
```

### Save site contents

`PUT /site_contents`

```json
{
  "language_id": "en",
  "items": [
    {
      "page": "home",
      "block_key": "hero-carousel",
      "block_type": "carousel-slide",
      "sort_order": 1,
      "data": {
        "title_1": "First slide",
        "title_2": "First highlight",
        "subtitle": "First description",
        "media_filepath": "/public/media/slide-1.webp"
      }
    },
    {
      "page": "home",
      "block_key": "teaser",
      "block_type": "teaser-title",
      "data": { "title": "Why us" }
    }
  ]
}
```

| Field                | Type   | Rules                                                                                        |
| -------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `language_id`        | string | Required active language code, case-insensitive. Applies to every item.                      |
| `items`              | array  | Required, non-empty.                                                                         |
| `items[].page`       | string | Required; with `block_key` and `block_type` must be an available combination.                |
| `items[].sort_order` | number | Required for sortable blocks; contiguous from 1 within each block. Omit or `1` otherwise.    |
| `items[].data`       | object | Required. Exactly the block's data fields as strings. Media blocks may add `media_filepath`. |

`data.media_filepath` is a string up to 255 characters or `null`, accepted only
on media blocks (`carousel-slide`, `company-picture`). A string must equal an
existing media item's `path`. The path is not linked by ID, so deleting that
media later leaves the stored path pointing at a missing file.

Saving applies to one language: for each sortable block in the request, include
its complete list; that language's stored items are deleted and recreated from
the request (new IDs, new create metadata). Non-sortable items are upserted at
`sort_order` 1. Blocks absent from the request are left unchanged. Everything is validated first and written in
one transaction.

Bahasa Indonesia first: saving any language other than `id` requires at least
one saved `id` item on any page, otherwise `400 Bad Request` with
`Bahasa Indonesia is required before adding another language.`

A successful request returns `200 OK` with `{ "site_contents": { "language_id", "items": [...] } }`,
items in request order. Invalid combinations, data fields, sort order,
duplicates, media paths, or languages return `400 Bad Request` (item errors
include the zero-based item index). Missing authentication returns `401
Unauthorized`; a missing or disallowed origin returns `403 Forbidden`.

## Languages

`GET /languages` is public and returns the active languages, ordered by `sort_order`, then `id`.
Every language list in the API (article `contents`, article list `languages`)
uses the same order.
Inactive languages are omitted and cannot receive article content.

A language `id` is its lowercase code (`id`, `en`). Every `language_id` input
is case-insensitive and normalized to lowercase, so `ID` and `id` are the same.

```json
{
  "languages": [
    {
      "id": "id",
      "language": "Bahasa Indonesia",
      "flag": "🇮🇩",
      "sort_order": 1,
      "is_active": true
    },
    {
      "id": "en",
      "language": "English",
      "flag": "🇬🇧",
      "sort_order": 2,
      "is_active": true
    }
  ]
}
```

## Articles

Article reads are public. Creating, updating, and deleting articles require an
authenticated session. State-changing requests must include the configured
frontend `Origin` or `Referer` as described under [Browser Sessions](#browser-sessions).

An article is a shared header (category, dates, photo, contact person) plus at
most one content row per language in `contents`. Title, slug, summary, content,
and status belong to a language. Slugs are unique across all languages, so a slug identifies one article and
one language; an article's languages cannot share a slug.

Each content has a server-computed `read_time` in whole minutes: the visible
characters of `content` (HTML tags removed, whitespace collapsed) divided by
1000 characters per minute, rounded up, minimum `1`. It is recalculated on every
save and cannot be sent in requests.

### List articles

`GET /articles`

Returns a page of articles with their related category and primary photo media.
Results are sorted by `created_at` descending by default, with `id` as a stable
tie-breaker.

| Query parameter       | Type   | Rules                                                                     |
| --------------------- | ------ | ------------------------------------------------------------------------- |
| `page`                | number | Optional, 1-based; default `1`.                                           |
| `limit`               | number | Optional; default `20`, minimum `1`, maximum `100`.                       |
| `search`              | string | Optional, case-insensitive substring search in a content `title`.         |
| `article_category_id` | number | Optional positive category ID filter.                                     |
| `language_id`         | string | Optional; only articles with content in this language, shown in it.       |
| `status`              | string | Optional; `DRAFT` or `PUBLISHED`; matches a content row with this status. |
| `sort_by`             | string | Optional; must be `created_at`, default `created_at`.                     |
| `sort_order`          | string | Optional; `asc` or `desc`, default `desc`.                                |

Provided filters are combined using AND. `search`, `language_id`, and `status`
must all match the same content row. Invalid query values return `400 Bad
Request`.

`title`, `slug`, `summary`, `status`, `read_time`, and `language_id` on each item come from
the `language_id` content when that query is set, otherwise from the content
with the first language by `sort_order`, then `id`. `languages` lists every active language with that
language's content status, or `null` when the article has no content in it.

```json
{
  "articles": [
    {
      "id": 12,
      "article_category_id": 3,
      "issue_date": "2026-10-10",
      "press_release_number": null,
      "primary_photo": 18,
      "primary_photo_url": "/public/media/company-news.jpg",
      "cp_name": null,
      "cp_role": null,
      "cp_phone_number": null,
      "cp_email": null,
      "created_at": "2026-10-10T10:30:00.000Z",
      "created_by": "Ari Putra",
      "updated_at": null,
      "updated_by": null,
      "article_category": {
        "id": 3,
        "name": "Company News",
        "slug": "company-news"
      },
      "language_id": "id",
      "title": "Kantor layanan baru dibuka",
      "slug": "kantor-layanan-baru-dibuka",
      "summary": "Ringkasan singkat.",
      "status": "PUBLISHED",
      "read_time": 1,
      "languages": [
        { "language_id": "id", "status": "PUBLISHED" },
        { "language_id": "en", "status": null }
      ]
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

- `GET /articles/slug/:slug` is for the landing page and returns
  `{ "article": ... }` with `200 OK`, in the same shape as the detail response.
  `contents` holds only `PUBLISHED` content in active languages. A slug that is
  unknown, a draft, or in an inactive language returns `404 Not Found` with
  `Article was not found.`
- `GET /articles/:articleId` returns `{ "article": ... }` with `200 OK`. The
  article has the shared header fields and every language's content in
  `contents`, ordered by language `sort_order`, then `language_id`.
- `POST /articles` creates the article header and its first language content,
  then returns `{ "article": ... }` with `201 Created`.
- `PUT /articles/:articleId` updates the shared fields that are sent and
  creates or replaces the content for `language_id`, then returns
  `{ "article": ... }` with `200 OK`. Omitted shared fields remain unchanged.
  Send `null` for `primary_photo` to clear its media relation.
- `DELETE /articles/:articleId` deletes an article and all of its contents and
  returns `204 No Content`.

Article POST and PUT bodies use JSON. Each request writes one language.
Bahasa Indonesia (`id`) comes first: `POST` must use `language_id` `id`, and a
`PUT` for any other language needs saved `id` content (draft or published).
Otherwise the request returns `400 Bad Request` with
`Bahasa Indonesia is required before adding another language.`

| Field                  | Type           | Rules                                                               |
| ---------------------- | -------------- | ------------------------------------------------------------------- |
| `language_id`          | string         | Required; ID of an active language.                                 |
| `title`                | string         | Required; maximum 120 characters.                                   |
| `slug`                 | string         | Required; maximum 255 characters; unique across all languages.      |
| `summary`              | string         | Required.                                                           |
| `content`              | string         | Required.                                                           |
| `status`               | string         | Required; `DRAFT` or `PUBLISHED`; applies to this language only.    |
| `article_category_id`  | number         | Required on create; positive ID of an existing category.            |
| `primary_photo`        | number or null | Picture media ID; required on create; optional or `null` on update. |
| `issue_date`           | date or null   | Optional; `YYYY-MM-DD`.                                             |
| `press_release_number` | string or null | Optional; maximum 255 characters.                                   |
| `cp_name`              | string or null | Optional; maximum 100 characters.                                   |
| `cp_role`              | string or null | Optional; maximum 100 characters.                                   |
| `cp_phone_number`      | string or null | Optional; maximum 100 characters.                                   |
| `cp_email`             | string or null | Optional; maximum 100 characters.                                   |

The referenced media record must exist and have type `PICTURE`. Article
responses include its ID in `primary_photo` and its public path in
`primary_photo_url`. Both response fields are `null` when no media is linked,
including after the media record is deleted.

On create, omitted nullable text/date fields are stored as `null`. On update,
omit a shared field to keep its current value; send `null` to clear nullable
fields. The authenticated user's name is stored in `created_by` on the article
and on new content; updates set `updated_by` and `updated_at` on the article and
on the content being replaced.

Article detail response:

```json
{
  "article": {
    "id": 12,
    "article_category_id": 3,
    "issue_date": "2026-10-10",
    "press_release_number": null,
    "primary_photo": 18,
    "primary_photo_url": "/public/media/company-news.jpg",
    "cp_name": null,
    "cp_role": null,
    "cp_phone_number": null,
    "cp_email": null,
    "created_at": "2026-10-10T10:30:00.000Z",
    "created_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null,
    "article_category": {
      "id": 3,
      "name": "Company News",
      "slug": "company-news"
    },
    "contents": [
      {
        "id": 40,
        "language_id": "id",
        "title": "Kantor layanan baru dibuka",
        "slug": "kantor-layanan-baru-dibuka",
        "summary": "Ringkasan singkat.",
        "content": "Isi artikel lengkap.",
        "status": "PUBLISHED",
        "read_time": 1,
        "created_at": "2026-10-10T10:30:00.000Z",
        "created_by": "Ari Putra",
        "updated_at": null,
        "updated_by": null
      }
    ]
  }
}
```

Example request:

```js
const response = await fetch(`${API_BASE_URL}/articles`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    article_category_id: 3,
    language_id: 'id',
    title: 'Kantor layanan baru dibuka',
    slug: 'kantor-layanan-baru-dibuka',
    summary: 'Ringkasan singkat.',
    content: 'Isi artikel lengkap.',
    status: 'DRAFT',
    issue_date: '2026-10-10',
    primary_photo: 18,
  }),
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

## Divisions and Services

Division and service reads are public. Creating, updating, deleting, and
reordering require an authenticated session and the configured frontend
`Origin` or `Referer`, as described under [Browser Sessions](#browser-sessions).
Requests use JSON. Names, abbreviations, and descriptions are stored per
language and returned in a `contents` array ordered by the language registry's
`sort_order` and language ID. Responses include only translations that exist;
clients choose the language to display and handle a missing translation.
Create requests and updates to translated fields require an active
`language_id`; unknown or inactive language IDs return `400 Bad Request`.

### Divisions

- `GET /divisions` returns `{ "divisions": [...] }` with `200 OK`, ordered by
  `sort_order` and then ID. The optional `status` query parameter filters the
  results to `DRAFT` or `PUBLISHED`; omitting it returns all divisions.
- `GET /divisions/:divisionId` returns `{ "division": ... }` with `200 OK`.
- `POST /divisions` creates a division and returns `{ "division": ... }` with
  `201 Created`. The division is appended to the current list.
- `PUT /divisions/:divisionId` partially updates a division and returns
  `{ "division": ... }` with `200 OK`.
- `POST /divisions/reorder` reorders all divisions and returns
  `{ "divisions": [...] }` with `200 OK`.
- `DELETE /divisions/:divisionId` returns `204 No Content`. Deleting a division
  also deletes its services and compacts the remaining divisions' order.

Create bodies accept these fields:

| Field         | Type           | Rules                                                                 |
| ------------- | -------------- | --------------------------------------------------------------------- |
| `language_id` | string         | Required; active language code such as `id`; normalized to lowercase. |
| `name`        | string         | Required; trimmed; 1–200 characters.                                  |
| `abbr`        | string         | Required; trimmed; 1–50 characters.                                   |
| `description` | string or null | Optional; no length limit; blank string becomes `null`.               |
| `icon_svg`    | string or null | Optional.                                                             |
| `status`      | string         | Optional; `DRAFT` or `PUBLISHED`; defaults to `DRAFT` on create.      |

Update bodies are partial. Updating `icon_svg` or `status` does not require a
language. Updating `name`, `abbr`, or `description` requires `language_id`.
Existing translations can be partially updated; adding a translation requires
both `name` and `abbr`. Send `null` for `icon_svg` or `description` to clear it.
The authenticated user's name is stored in `created_by`; updates set
`updated_by` and `updated_at` on the division.

Example create request:

```json
{
  "language_id": "en",
  "name": "Customer Services",
  "abbr": "CS",
  "icon_svg": "<svg></svg>",
  "description": "Energy management services for organizations.",
  "status": "PUBLISHED"
}
```

The response shape is:

```json
{
  "division": {
    "id": 1,
    "icon_svg": "<svg></svg>",
    "status": "PUBLISHED",
    "sort_order": 1,
    "created_at": "2026-10-11T10:30:00.000Z",
    "created_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null,
    "contents": [
      {
        "language_id": "en",
        "name": "Customer Services",
        "abbr": "CS",
        "description": "Energy management services for organizations."
      }
    ]
  }
}
```

For example, add Indonesian content to the same division with
`PUT /divisions/1`:

```json
{
  "language_id": "id",
  "name": "Layanan Pelanggan",
  "abbr": "LP",
  "description": "Layanan manajemen energi untuk organisasi."
}
```

`POST /divisions/reorder` accepts the complete current division ID list in the
desired order. Every existing ID must appear exactly once; duplicate, missing,
or unknown IDs return `400 Bad Request` without changing the order. An empty
array succeeds only when there are no divisions. A successful reorder assigns
`sort_order` values starting at 1 in the submitted order.

```json
{ "division_ids": [4, 1, 3] }
```

For example, `GET /divisions?status=PUBLISHED` returns only published
divisions. Invalid status values and unknown query parameters return
`400 Bad Request`.

### Services

- `GET /services` returns `{ "services": [...] }` with `200 OK`, ordered by
  `division_id`, `sort_order`, and ID.
- `GET /services/:serviceId` returns `{ "service": ... }` with `200 OK`.
- `POST /services` creates a service and returns `{ "service": ... }` with
  `201 Created`. The service is appended to its division's list.
- `PUT /services/:serviceId` partially updates a service and returns
  `{ "service": ... }` with `200 OK`. Moving a service appends it to the
  destination division and compacts its former division.
- `POST /services/reorder` reorders all services for one division and returns
  `{ "services": [...] }` with `200 OK`.
- `DELETE /services/:serviceId` returns `204 No Content` and removes its
  gallery links without deleting media records.

Service create and update bodies accept these fields:

| Field         | Type              | Rules                                                                        |
| ------------- | ----------------- | ---------------------------------------------------------------------------- |
| `language_id` | string            | Required on create; active language code.                                    |
| `division_id` | integer           | Positive ID of an existing division; required on create.                     |
| `name`        | string            | Required on create; trimmed; 1–200 characters.                               |
| `description` | string or null    | Optional; no length limit; blank string becomes `null`.                      |
| `media_ids`   | array of integers | Optional; unique positive IDs of existing `PICTURE` media, in display order. |

Updates are partial; omitted fields remain unchanged. Updating `name` or
`description` requires `language_id`. Existing translations can be partially
updated; adding a translation requires `name`. On create, an omitted
`media_ids` creates an empty gallery. On update, an omitted `media_ids` keeps
the current gallery; sending an array replaces it, and `[]` clears it. Invalid,
duplicate, missing, or non-picture media IDs return `400 Bad Request`. New
services append after the division's current maximum `sort_order`. The
authenticated user's name is stored in `created_by`; updates set `updated_by`
and `updated_at` on the service.

Example create request:

```json
{
  "language_id": "en",
  "division_id": 1,
  "name": "Customer Support",
  "description": "Support for energy management initiatives.",
  "media_ids": [24, 31]
}
```

For example, `GET /services/:serviceId` returns:

```json
{
  "service": {
    "id": 12,
    "division_id": 1,
    "sort_order": 1,
    "created_at": "2026-10-11T10:30:00.000Z",
    "created_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null,
    "contents": [
      {
        "language_id": "en",
        "name": "Customer Support",
        "description": "Support for energy management initiatives."
      }
    ],
    "media": [
      {
        "id": 24,
        "filename": "customer-support.jpg",
        "path": "/public/media/customer-support.jpg",
        "extension": "jpg",
        "type": "PICTURE",
        "size": 245760,
        "metadata": { "width": 1600, "height": 900 },
        "created_by": "Ari Putra",
        "created_at": "2026-10-11T10:20:00.000Z"
      }
    ],
    "division": {
      "id": 1,
      "icon_svg": null,
      "status": "PUBLISHED",
      "sort_order": 1,
      "created_at": "2026-10-11T10:00:00.000Z",
      "created_by": "Ari Putra",
      "updated_at": null,
      "updated_by": null,
      "contents": [
        {
          "language_id": "id",
          "name": "Layanan Pelanggan",
          "abbr": "LP",
          "description": null
        },
        {
          "language_id": "en",
          "name": "Customer Services",
          "abbr": "CS",
          "description": null
        }
      ]
    }
  }
}
```

`POST /services/reorder` accepts the complete current service ID list for the
specified division in the desired order. Every service in that division must
appear exactly once; duplicate, missing, unknown, or out-of-division IDs
return `400 Bad Request` without changing any order. A nonexistent division
returns `400 Bad Request`. An empty array succeeds only if the division has no
services. A successful reorder assigns `sort_order` values starting at 1 in
the submitted order. IDs and other service fields are preserved.

```json
{
  "division_id": 1,
  "service_ids": [12, 15, 13]
}
```

Deleting a service compacts the remaining services in its division while
preserving their relative order (existing `sort_order`, then ID). Deleting a
division cascades to its services and compacts the remaining divisions.

Invalid fields or references return `400 Bad Request`; missing division or
service IDs on detail, update, and delete routes return `404 Not Found`.
Unauthenticated writes return `401 Unauthorized`; missing or disallowed request
origins return `403 Forbidden`.

## Board members

Board member type and member reads are public. Creating, updating, and deleting
types or members require an authenticated session and the configured frontend
`Origin` or `Referer`.

### Board member types

- `GET /board_member_types` returns `{ "board_member_types": [...] }` with
  `200 OK`.
- `GET /board_member_types/:typeId` returns `{ "board_member_type": ... }` with
  `200 OK`.
- `POST /board_member_types` creates a type and returns
  `{ "board_member_type": ... }` with `201 Created`.
- `PUT /board_member_types/:typeId` updates a type name and returns
  `{ "board_member_type": ... }` with `200 OK`.
- `DELETE /board_member_types/:typeId` returns `204 No Content`. Deleting a
  type removes only member translations that reference it. Members with other
  translations remain; members with no translations are deleted with their
  stored photos.

Create requests use JSON with a `type` string of 1–100 characters and a required
`language_id` for an active language. Updates accept a `type` string;
`language_id` is fixed when the type is created. A type response contains `id`,
`type`, and `language_id`.

### Board members

- `GET /board_members` returns `{ "board_members": [...] }` with `200 OK`.
- `GET /board_members/:memberId` returns `{ "board_member": ... }` with
  `200 OK`.
- `POST /board_members` creates a member and returns `{ "board_member": ... }`
  with `201 Created`.
- `PUT /board_members/:memberId` partially updates a member and returns
  `{ "board_member": ... }` with `200 OK`.
- `DELETE /board_members/:memberId` returns `204 No Content` and removes its
  stored photo, if present.

Members are ordered by the shared `sort_order`, then ID. The optional query
parameters can be combined:

| Query parameter        | Type   | Rules                                                          |
| ---------------------- | ------ | -------------------------------------------------------------- |
| `search`               | string | Case-insensitive substring search in member name.              |
| `board_member_type_id` | number | Positive ID; returns members with content linked to this type. |

Create requests require `name` (1–200 characters), `language_id` (an active
language), `role` (1–100 characters), and `board_member_type_id` (positive ID
of a type in the same language). `company_name` is an optional nullable shared
field of up to 100 characters; omitting it stores `null`. Blank values are
trimmed and treated as `null`. `description` is optional and nullable.
Updates accept `name`, `company_name`, `sort_order`, or translated fields
optionally, and require at least one field or a photo upload. Omitting
`company_name` leaves it unchanged, while `null` or a blank value clears it.
Updating `role`, `board_member_type_id`, or `description` requires
`language_id`. When adding a translation, both `role` and
`board_member_type_id` are required. The type must use that same language.
`name`, `company_name`, and `sort_order` are shared across translations.

New members append to the global member order when `sort_order` is omitted. A
supplied position inserts the member and shifts following members. Updating a
member's `sort_order` moves it in that same order, and deleting a member
compacts the remaining positions. Positions must be between 1 and the resulting
list length; invalid positions return `400 Bad Request`.

Requests without a photo use JSON. To upload or replace a photo, send
`multipart/form-data` with the same fields and an optional file field named
`photo`. Photos may be PNG, JPG, or JPEG files up to 5 MiB. The server checks
the image content and stores the file at
`/public/board_member/{memberId}.{extension}`. The `photo` response field
contains this public path. Omitting `photo` during an update keeps the current
photo.

A member response includes every available translation:

```json
{
  "board_member": {
    "id": 12,
    "name": "Ari Putra",
    "company_name": "PLN Energi Primer Indonesia",
    "photo": "/public/board_member/12.jpg",
    "sort_order": 1,
    "created_at": "2026-10-11T10:30:00.000Z",
    "created_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null,
    "contents": [
      {
        "language_id": "id",
        "role": "Direktur Utama",
        "board_member_type_id": 1,
        "description": null,
        "board_member_type": {
          "id": 1,
          "type": "Dewan Direksi",
          "language_id": "id"
        }
      },
      {
        "language_id": "en",
        "role": "President Director",
        "board_member_type_id": 3,
        "description": "Leads the company.",
        "board_member_type": {
          "id": 3,
          "type": "Board of Directors",
          "language_id": "en"
        }
      }
    ]
  }
}
```

Example browser upload:

```js
const formData = new FormData();
formData.append('name', 'Ari Putra');
formData.append('company_name', 'PLN Energi Primer Indonesia');
formData.append('language_id', 'en');
formData.append('role', 'President Director');
formData.append('board_member_type_id', '3');
formData.append('description', 'Leads the company.');
formData.append('photo', imageFile);

const response = await fetch(`${API_BASE_URL}/board_members`, {
  method: 'POST',
  credentials: 'include',
  body: formData,
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

Do not set the multipart `Content-Type` header manually; the browser adds its
boundary. Invalid fields, type references, or image files return
`400 Bad Request`; missing IDs return `404 Not Found`; oversized uploads return
`413 Payload Too Large`. Unauthenticated writes return `401 Unauthorized`, and
missing or disallowed request origins return `403 Forbidden`.

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
it and removes any service gallery links that reference it. The stored file is
removed after the database deletion commits.

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

## Document Commitments

Document commitment reads are public. Creating, updating, and deleting
categories or documents require an authenticated session and the configured
frontend `Origin` or `Referer`, as described under [Browser Sessions](#browser-sessions).

### Categories

- `GET /document_commitment_categories` returns
  `{ "documentCommitmentCategories": [...] }` with `200 OK`.
- `GET /document_commitment_categories/:categoryId` returns
  `{ "documentCommitmentCategory": ... }` with `200 OK`.
- `POST /document_commitment_categories` creates a category and returns
  `{ "documentCommitmentCategory": ... }` with `201 Created`.
- `PUT /document_commitment_categories/:categoryId` partially updates a
  category and returns `{ "documentCommitmentCategory": ... }` with `200 OK`.
- `DELETE /document_commitment_categories/:categoryId` returns
  `204 No Content`. Deleting a category also deletes its document records and
  stored PDF files.

Category create and update requests use JSON with a `name` field, trimmed to
1–100 characters. The name is required on create; omitted fields remain
unchanged on update.

```json
{ "name": "Board Decisions" }
```

### Documents

- `GET /document_commitments` returns
  `{ "documentCommitments": [...], "pagination": ... }` with `200 OK`.
- `GET /document_commitments/:documentId` returns
  `{ "documentCommitment": ... }` with `200 OK`.
- `POST /document_commitments` creates a document commitment and returns
  `{ "documentCommitment": ... }` with `201 Created`.
- `PUT /document_commitments/:documentId` partially updates a document and
  returns `{ "documentCommitment": ... }` with `200 OK`.
- `DELETE /document_commitments/:documentId` returns `204 No Content` and
  removes its stored PDF after the database deletion commits.

Create requests use `multipart/form-data` with a `file` field and these text
fields:

| Field                             | Type   | Rules                                                  |
| --------------------------------- | ------ | ------------------------------------------------------ |
| `document_commitment_category_id` | number | Required; positive ID of an existing category.         |
| `title`                           | string | Required; trimmed; 1–200 characters.                   |
| `status`                          | string | Optional; `DRAFT` or `PUBLISHED`; defaults to `DRAFT`. |
| `file`                            | file   | Required; valid PDF, maximum 50 MiB.                   |

The server stores each file at `public/document_commitment/{filename}`, using
the original uploaded filename. `file_path` contains the URL-encoded public
path, and `size` is rounded up to KiB (1024 bytes). Filenames must be safe
basenames and unique across document commitments. Reusing a filename returns
`409 Conflict`; the server never overwrites an unrelated file.
The authenticated user's name is stored in `uploaded_by`; `uploaded_at`
defaults to the current time.

Updates are partial. Send JSON to update metadata only, or use
`multipart/form-data` to replace the PDF and optionally update metadata. When
no file is sent, the existing PDF is kept. Replacing a PDF keeps the same
filename replaces that document's file in place. A filename used by another
document returns `409 Conflict`. A new filename moves the document to the new
path and removes the old file after the database update commits. Every update
sets `updated_at` and `updated_by` to the current time and authenticated user's
name.

```js
const formData = new FormData();
formData.append('document_commitment_category_id', '2');
formData.append('title', 'Board decision 2026-10');
formData.append('status', 'PUBLISHED');
formData.append('file', pdfFile);

const response = await fetch(`${API_BASE_URL}/document_commitments`, {
  method: 'POST',
  credentials: 'include',
  body: formData,
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

`GET /document_commitments` accepts these optional query parameters:

| Query parameter                   | Type   | Rules                                                   |
| --------------------------------- | ------ | ------------------------------------------------------- |
| `page`                            | number | Optional, 1-based; default `1`.                         |
| `limit`                           | number | Optional; default `20`, minimum `1`, maximum `100`.     |
| `search`                          | string | Optional, case-insensitive substring search in `title`. |
| `document_commitment_category_id` | number | Optional positive category ID filter.                   |
| `status`                          | string | Optional; `DRAFT` or `PUBLISHED`.                       |

Filters are combined using AND. Results are ordered by `uploaded_at` descending
with ID as a stable tie-breaker. Invalid query values return `400 Bad Request`.

A document response has this shape:

```json
{
  "documentCommitment": {
    "id": 21,
    "document_commitment_category_id": 2,
    "title": "Board decision 2026-10",
    "file_path": "/public/document_commitment/board-decision-2026-10.pdf",
    "filename": "board-decision-2026-10.pdf",
    "size": 420,
    "status": "PUBLISHED",
    "uploaded_at": "2026-10-11T10:30:00.000Z",
    "uploaded_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null,
    "document_commitment_category": {
      "id": 2,
      "name": "Board Decisions"
    }
  }
}
```

Invalid fields, category references, or PDF files return `400 Bad Request`;
missing document or category IDs return `404 Not Found`. Uploads over 50 MiB
return `413 Payload Too Large`.

## FAQs

FAQ reads are public. Creating, updating, deleting, and reordering require an
authenticated session and the configured frontend `Origin` or `Referer`, as
described under [Browser Sessions](#browser-sessions). Requests use JSON.

- `GET /faqs` returns `{ "faqs": [...] }` with `200 OK`, ordered by
  `sort_order` and then ID. The optional `status` query parameter filters the
  results to `DRAFT` or `PUBLISHED`; omitting it returns all FAQs. The public
  site should request `GET /faqs?status=PUBLISHED`.
- `GET /faqs/:faqId` returns `{ "faq": ... }` with `200 OK`.
- `POST /faqs` creates an FAQ and returns `{ "faq": ... }` with
  `201 Created`. The FAQ is appended to the current list. To duplicate an FAQ,
  send its copied fields to this endpoint.
- `PUT /faqs/:faqId` partially updates an FAQ and returns `{ "faq": ... }` with
  `200 OK`.
- `POST /faqs/reorder` reorders all FAQs and returns `{ "faqs": [...] }` with
  `200 OK`.
- `DELETE /faqs/:faqId` returns `204 No Content` and compacts the remaining
  FAQs' order.

Create and update bodies accept these fields:

| Field      | Type   | Rules                                                            |
| ---------- | ------ | ---------------------------------------------------------------- |
| `question` | string | Required on create; trimmed; 1–200 characters.                   |
| `answer`   | string | Required on create; HTML from the rich-text editor; not empty.   |
| `status`   | string | Optional; `DRAFT` or `PUBLISHED`; defaults to `DRAFT` on create. |

On update, omitted fields remain unchanged; an empty body returns
`400 Bad Request`. The authenticated user's name is stored in `created_by`;
updates set `updated_by` and `updated_at`. The `answer` HTML is stored as sent,
so clients rendering it on the public site should sanitize it.

Example create request:

```json
{
  "question": "Apa itu REC dan SPE?",
  "answer": "<p>REC adalah instrumen berupa sertifikat...</p>",
  "status": "PUBLISHED"
}
```

The response shape is:

```json
{
  "faq": {
    "id": 1,
    "question": "Apa itu REC dan SPE?",
    "answer": "<p>REC adalah instrumen berupa sertifikat...</p>",
    "status": "PUBLISHED",
    "sort_order": 1,
    "created_at": "2026-10-13T10:30:00.000Z",
    "created_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null
  }
}
```

`POST /faqs/reorder` accepts the complete current FAQ ID list in the desired
order. Every existing ID must appear exactly once; duplicate, missing, or
unknown IDs return `400 Bad Request` without changing the order. An empty array
succeeds only when there are no FAQs. A successful reorder assigns `sort_order`
values starting at 1 in the submitted order.

```json
{ "faq_ids": [3, 1, 2, 4] }
```

Invalid IDs, fields, status values, and unknown query parameters return
`400 Bad Request`; a missing FAQ returns `404 Not Found`.

### Fetch example

```ts
const response = await fetch(`${API_BASE_URL}/faqs/reorder`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ faq_ids: [3, 1, 2, 4] }),
});
const { faqs } = await response.json();
```

## Clients

Client reads are public. Creating, updating, deleting, and reordering require an
authenticated session and the configured frontend `Origin` or `Referer`, as
described under [Browser Sessions](#browser-sessions). Clients are the partner
logos shown in the "Klien Kami" section of the home page.

- `GET /clients` returns `{ "clients": [...] }` with `200 OK`, ordered by
  `sort_order` and then ID.
- `GET /clients/:clientId` returns `{ "client": ... }` with `200 OK`.
- `POST /clients` creates a client and returns `{ "client": ... }` with
  `201 Created`. The client is appended to the current list.
- `PUT /clients/:clientId` partially updates a client and returns
  `{ "client": ... }` with `200 OK`.
- `POST /clients/reorder` reorders all clients and returns
  `{ "clients": [...] }` with `200 OK`.
- `DELETE /clients/:clientId` returns `204 No Content`, removes the logo file,
  and compacts the remaining clients' order.

Create and update requests use `multipart/form-data` with these fields:

| Field  | Type   | Rules                                                                        |
| ------ | ------ | ---------------------------------------------------------------------------- |
| `name` | string | Required on create; trimmed; 1–200 characters.                               |
| `logo` | file   | Required on create; PNG, JPG, JPEG, or WEBP; maximum 5 MiB; content-checked. |

On update, omitted fields remain unchanged; a request with neither `name` nor
`logo` returns `400 Bad Request`. Uploading a new `logo` replaces the previous
file. The authenticated user's name is stored in `created_by`; updates set
`updated_by` and `updated_at`.

Logos are uploaded directly and are not part of the media library. The server
stores each logo at `/public/clients/{name}-{timestamp}.{extension}`, where
`{name}` is the uploaded filename lowercased with non-alphanumeric characters
replaced by `-`, and `{timestamp}` is the upload time in milliseconds. The
response includes:

- `logo_filename`: the stored filename.
- `logo_filepath`: the public path; build the logo URL from it, as described
  under [Public Static Assets](#public-static-assets).
- `logo_extension`: `png`, `jpg`, `jpeg`, or `webp`.
- `logo_size`: the file size rounded up to KiB (1024 bytes).
- `logo_metadata`: the pixel `width` and `height`.

Upload logos as transparent PNG or WEBP files.

Example browser upload:

```js
const formData = new FormData();
formData.append('name', 'Accenture');
formData.append('logo', logoFile);

const response = await fetch(`${API_BASE_URL}/clients`, {
  method: 'POST',
  credentials: 'include',
  body: formData,
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

Do not set the multipart `Content-Type` header manually; the browser adds its
boundary.

The response shape is:

```json
{
  "client": {
    "id": 1,
    "name": "Accenture",
    "logo_filename": "logo-accenture-1791913320264.png",
    "logo_filepath": "/public/clients/logo-accenture-1791913320264.png",
    "logo_extension": "png",
    "logo_size": 18,
    "logo_metadata": { "width": 400, "height": 160 },
    "sort_order": 1,
    "created_at": "2026-10-13T10:30:00.000Z",
    "created_by": "Ari Putra",
    "updated_at": null,
    "updated_by": null
  }
}
```

`POST /clients/reorder` accepts the complete current client ID list in the
desired order. Every existing ID must appear exactly once; duplicate, missing,
or unknown IDs return `400 Bad Request` without changing the order. An empty
array succeeds only when there are no clients. A successful reorder assigns
`sort_order` values starting at 1 in the submitted order.

```json
{ "client_ids": [3, 1, 2, 4] }
```

Invalid IDs, fields, or logo files return `400 Bad Request`; a missing client
returns `404 Not Found`; logos over 5 MiB return `413 Payload Too Large`.

### Fetch example

```ts
const response = await fetch(`${API_BASE_URL}/clients/reorder`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_ids: [3, 1, 2, 4] }),
});
const { clients } = await response.json();
```

## Inboxes

Inboxes store messages sent from the public site's contact form. Listing
subjects and submitting a message are public. Listing, counting, updating,
marking all as read, and deleting require an authenticated session and the
configured frontend `Origin` or `Referer`, as described under
[Browser Sessions](#browser-sessions). Requests use JSON.

> The public submit endpoint is still subject to the `Origin` check, so the
> landing page cannot call it yet. It also has no rate limiting or spam
> protection yet.

- `GET /inbox-subjects` returns `{ "inbox_subjects": [...] }` with `200 OK`,
  ordered by ID. Subjects are seeded and cannot be managed through the API.
- `POST /inboxes` submits a contact-form message and returns `{ "inbox": ... }`
  with `201 Created`. New messages are unread.
- `GET /inboxes` returns `{ "inboxes": [...], "pagination": ... }` with
  `200 OK`, newest first.
- `GET /inboxes/counts` returns `{ "unreadCount": 2, "readCount": 3 }` with
  `200 OK`.
- `PUT /inboxes/:inboxId` updates the read status and returns
  `{ "inbox": ... }` with `200 OK`.
- `POST /inboxes/read-all` marks every inbox as read and returns
  `204 No Content`.
- `DELETE /inboxes/:inboxId` permanently deletes an inbox and returns
  `204 No Content`.

`POST /inboxes` accepts these fields:

| Field              | Type           | Rules                                                     |
| ------------------ | -------------- | --------------------------------------------------------- |
| `name`             | string         | Required; trimmed; 1–100 characters.                      |
| `email`            | string         | Required; trimmed; valid email; up to 254 characters.     |
| `company`          | string \| null | Optional; trimmed; up to 200 characters; blank is `null`. |
| `phone`            | string \| null | Optional; trimmed; up to 30 characters; blank is `null`.  |
| `inbox_subject_id` | integer        | Required; must be an existing inbox subject ID.           |
| `message`          | string         | Required; trimmed; 1–5000 characters.                     |

`PUT /inboxes/:inboxId` accepts only `{ "is_read": true }` or
`{ "is_read": false }`.

`GET /inboxes` accepts these query parameters:

| Parameter          | Default | Rules                                                      |
| ------------------ | ------- | ---------------------------------------------------------- |
| `page`             | `1`     | Positive integer.                                          |
| `limit`            | `20`    | Integer from 1 to 100.                                     |
| `search`           | none    | Case-insensitive match on the sender name or subject name. |
| `inbox_subject_id` | none    | Returns only inboxes with this subject.                    |

Example create request:

```json
{
  "name": "Budi Santoso",
  "email": "budi.santoso@example.com",
  "company": "PT Nusantara Data Center",
  "phone": "+62 812 3456 7890",
  "inbox_subject_id": 2,
  "message": "Kami ingin menanyakan layanan audit energi."
}
```

The inbox shape is:

```json
{
  "inbox": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi.santoso@example.com",
    "company": "PT Nusantara Data Center",
    "phone": "+62 812 3456 7890",
    "message": "Kami ingin menanyakan layanan audit energi.",
    "is_read": false,
    "inbox_subject": { "id": 2, "name": "Services" },
    "created_at": "2026-10-14T10:30:00.000Z"
  }
}
```

The list response's `pagination` has `page`, `limit`, `totalItems`, and
`totalPages`, as for articles.

An unknown `inbox_subject_id` on create, invalid IDs, fields, or query
parameters return `400 Bad Request`; a missing inbox returns `404 Not Found`.

### Fetch example

```ts
const response = await fetch(`${API_BASE_URL}/inboxes?page=1&search=budi`, {
  credentials: 'include',
});
const { inboxes, pagination } = await response.json();
```

## Site Settings

Site settings hold the company identity, contact details, and social media
links shown in the landing page navbar, footer, and "Hubungi Kami" page. Each
setting is a key/value row per language; keys are seeded master data for each
language. Social media items are shared by all languages.

Company location coordinates are sent and returned as numbers. Latitude must
be between `-90` and `90`, and longitude between `-180` and `180`.

In the response, configured text keys are strings (`""` until a value is
saved), while unset coordinates are `null`. A key with no row for that
language is also `null`. The CMS disables inputs whose key is `null`.

- `GET /site_settings?language_id=id` is public and returns
  `{ "site_settings": ... }` with `200 OK`. `language_id` is optional and
  defaults to Bahasa Indonesia (`id`); an unknown or inactive language returns
  `400 Bad Request`. Signed-in users receive every social media item; everyone
  else receives only `PUBLISHED` items.
- `PUT /site_settings` requires an authenticated session and the configured
  frontend `Origin` or `Referer`. It saves the setting values for
  `language_id`, replaces the whole social media list, and returns
  `{ "site_settings": ... }` for that language with `200 OK`.

`PUT /site_settings` uses `multipart/form-data`:

| Field            | Type        | Rules                                                                                 |
| ---------------- | ----------- | ------------------------------------------------------------------------------------- |
| `data`           | JSON string | Required; the settings payload below.                                                 |
| `danantara_logo` | file        | Optional; PNG, JPG, JPEG, WEBP, or SVG; maximum 2 MiB. Omit to keep the current logo. |
| `pln_logo`       | file        | Optional; same rules as `danantara_logo`.                                             |
| `social_icons`   | file[]      | Optional; SVG only; maximum 1 MiB each; up to 20. Each must be referenced by an item. |

The `data` payload:

| Field                     | Type           | Rules                                                         |
| ------------------------- | -------------- | ------------------------------------------------------------- |
| `language_id`             | string         | Required; ID of an active language.                           |
| `company_name`            | string         | Required; trimmed; 1–200 characters.                          |
| `company_short_name`      | string \| null | Optional; up to 50 characters; blank is `null`.               |
| `company_address`         | string         | Required; trimmed; 1–500 characters.                          |
| `company_location_lat`    | number \| null | Optional; latitude from `-90` to `90`; `null` clears it.      |
| `company_location_long`   | number \| null | Optional; longitude from `-180` to `180`; `null` clears it.   |
| `company_phone_number`    | string \| null | Optional; up to 30 characters; blank is `null`.               |
| `company_whatsapp_number` | string \| null | Optional; up to 30 characters; blank is `null`.               |
| `main_email`              | string \| null | Optional; valid email; blank is `null`.                       |
| `marketing_email`         | string \| null | Optional; valid email; blank is `null`.                       |
| `operational_day`         | string \| null | Optional; up to 100 characters, e.g. `"Senin - Jumat"`.       |
| `operational_start_time`  | string \| null | Optional; `HH:mm`. Must be sent together with the end time.   |
| `operational_end_time`    | string \| null | Optional; `HH:mm`. Must be sent together with the start time. |
| `social_medias`           | array          | Required (may be empty); up to 20 items, in display order.    |

Each `social_medias` item:

| Field                          | Type    | Rules                                                                                  |
| ------------------------------ | ------- | -------------------------------------------------------------------------------------- |
| `id`                           | integer | Omit to create a new item; send an existing ID to update it.                           |
| `platform_name`                | string  | Required; trimmed; 1–50 characters.                                                    |
| `platform_url_or_account_name` | string  | Required; trimmed; 1–255 characters.                                                   |
| `status`                       | string  | `DRAFT` (hidden on the landing page) or `PUBLISHED`.                                   |
| `icon_index`                   | integer | Optional; index into the uploaded `social_icons` files. Omit to keep the current icon. |

The list is synced to the request: existing items missing from
`social_medias` are deleted with their icon files, and `sort_order` follows the
array position starting at 1. Replaced logos and icons are removed after the
save succeeds.

Uploaded SVG files are sanitized: scripts, event handlers, `foreignObject`, and
`javascript:` links are removed, and a file with no valid `<svg>` left returns
`400 Bad Request`. Logos are stored at `/public/site-logo-{name}-{timestamp}.{extension}`
and icons at `/public/site-social-medias/site-social-media-{name}-{timestamp}.svg`.
Only the logo filepath is kept. `icon_metadata` is the pixel `width` and
`height` for raster images and `{}` for SVG.

Omitted optional fields keep their stored value. Sending a field, or uploading
a logo, whose key has no row for `language_id` returns `400 Bad Request` with
`Input key not configured for this language.`

Top-level `created_*` comes from that language's earliest setting row and
`updated_*` from its most recently updated one; both are `null` when the
language has no rows.

Example browser request:

```js
const formData = new FormData();
formData.append(
  'data',
  JSON.stringify({
    language_id: 'id',
    company_name: 'PT Energy Management Indonesia (Persero)',
    company_short_name: 'PLN EMI',
    company_address: 'Menara Sentraya Lt. 17, Jakarta Selatan 12160',
    company_location_lat: -6.2249,
    company_location_long: 106.8172,
    company_phone_number: '021-27881925',
    company_whatsapp_number: '0821-1779-291',
    main_email: 'emi@pln.co.id',
    marketing_email: 'pemasaran@emipersero.co.id',
    operational_day: 'Senin - Jumat',
    operational_start_time: '08:00',
    operational_end_time: '17:00',
    social_medias: [
      {
        id: 1,
        platform_name: 'Instagram',
        platform_url_or_account_name: '@ptemi_id',
        status: 'PUBLISHED',
      },
      {
        platform_name: 'YouTube',
        platform_url_or_account_name: '@EnergyManagementIndonesia',
        status: 'PUBLISHED',
        icon_index: 0,
      },
    ],
  }),
);
formData.append('pln_logo', plnLogoFile);
formData.append('social_icons', youtubeIconFile);

const response = await fetch(`${API_BASE_URL}/site_settings`, {
  method: 'PUT',
  credentials: 'include',
  body: formData,
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);
```

The response shape is:

```json
{
  "site_settings": {
    "language_id": "id",
    "company_name": "PT Energy Management Indonesia (Persero)",
    "company_short_name": "PLN EMI",
    "danantara_logo_filepath": "",
    "pln_logo_filepath": "/public/site-logo-pln-emi-1792136400000.svg",
    "company_address": "Menara Sentraya Lt. 17, Jakarta Selatan 12160",
    "company_location_lat": -6.2249,
    "company_location_long": 106.8172,
    "company_phone_number": "021-27881925",
    "company_whatsapp_number": "0821-1779-291",
    "main_email": "emi@pln.co.id",
    "marketing_email": "pemasaran@emipersero.co.id",
    "operational_day": "Senin - Jumat",
    "operational_start_time": "08:00",
    "operational_end_time": "17:00",
    "social_medias": [
      {
        "id": 2,
        "platform_name": "YouTube",
        "platform_url_or_account_name": "@EnergyManagementIndonesia",
        "icon_filename": "site-social-media-youtube-1792136400001.svg",
        "icon_filepath": "/public/site-social-medias/site-social-media-youtube-1792136400001.svg",
        "icon_extension": "svg",
        "icon_size": 1,
        "icon_metadata": {},
        "status": "PUBLISHED",
        "sort_order": 1,
        "created_at": "2026-10-16T10:30:00.000Z",
        "created_by": "Ari Putra",
        "updated_at": null,
        "updated_by": null
      }
    ],
    "created_at": "2026-10-16T10:00:00.000Z",
    "created_by": "system",
    "updated_at": "2026-10-16T10:30:00.000Z",
    "updated_by": "Ari Putra"
  }
}
```

Invalid fields, files, or `icon_index` references return
`400 Bad Request`; an unknown social media `id` returns
`404 Not Found`; files over their size limit return `413 Payload Too Large`; a
setting key missing from the seed returns `500 Internal Server Error`.

## Public Static Assets

Files in the project `public/` directory are served without authentication at
the matching `/public/*` path and allow cross-origin reads. SVG files are
served with `Content-Security-Policy: default-src 'none'; style-src
'unsafe-inline'; sandbox` and `X-Content-Type-Options: nosniff`, so an SVG
opened directly cannot run scripts. For example,
`public/media/company-news.jpg` is available at
`http://localhost:8000/public/media/company-news.jpg`. A document commitment
PDF such as `public/document_commitment/board-decision-2026-10.pdf` is
available at
`http://localhost:8000/public/document_commitment/board-decision-2026-10.pdf`.
A client logo such as `public/clients/logo-accenture-1791913320264.png` is
available at
`http://localhost:8000/public/clients/logo-accenture-1791913320264.png`.

## Article, Category, Media, and Document Commitment Errors

| Status                  | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `400 Bad Request`       | Invalid ID, body or query value, category, media or language reference, or uploaded PDF. |
| `401 Unauthorized`      | A write request does not have a valid session.                                           |
| `403 Forbidden`         | A write request has a missing or disallowed `Origin`/`Referer`.                          |
| `404 Not Found`         | The requested article, category, media, or document commitment does not exist.           |
| `409 Conflict`          | Article slug, category slug, media filename, or document filename is already in use.     |
| `413 Payload Too Large` | An uploaded file exceeds the limit for its media type or document commitment.            |

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
