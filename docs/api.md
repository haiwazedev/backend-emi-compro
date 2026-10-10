# API Reference

This document describes the API for frontend integration.

## Base URL and Requests

The default local base URL is `http://localhost:8000`. Replace it with the
server's deployed URL when integrating with another environment. The port can
be changed with the `PORT` environment variable.

Send JSON request bodies with the `Content-Type: application/json` header.
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
