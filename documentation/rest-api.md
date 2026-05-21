# WatchTower REST API Documentation

This document describes the REST API exposed by `backend/app.js`.

## Index

- [Base URL](#base-url)
- [Request Format](#request-format)
- [Response Format](#response-format)
- [Common IDs](#common-ids)
- [Users](#users)
  - [Create User](#create-user)
  - [Get User](#get-user)
  - [Update User](#update-user)
  - [Delete User](#delete-user)
- [Apps](#apps)
  - [Create App](#create-app)
  - [Get App](#get-app)
  - [List Apps By Owner](#list-apps-by-owner)
  - [Delete App](#delete-app)
- [Error Events](#error-events)
  - [Create Error Event](#create-error-event)
  - [Get Error Event](#get-error-event)
  - [List Error Events By App](#list-error-events-by-app)
  - [Delete Error Event](#delete-error-event)
- [Performance Events](#performance-events)
  - [Create Performance Event](#create-performance-event)
  - [Get Performance Event](#get-performance-event)
  - [List Performance Events By App](#list-performance-events-by-app)
  - [Delete Performance Event](#delete-performance-event)

## Base URL

Local development:

```text
http://localhost:3000
```

All API routes are prefixed with `/api`.

## Request Format

The backend uses `express-formidable`, so endpoints can accept form fields. The examples below use JSON because that is the most readable format for API clients and tests.

```http
Content-Type: application/json
```

## Response Format

Successful responses return JSON with one top-level resource key:

- `{ "user": ... }`
- `{ "app": ... }`
- `{ "event": ... }`
- `{ "apps": [...] }`
- `{ "events": [...] }`

Error responses return:

```json
{
  "error": "Error message"
}
```

## Common IDs

Route parameters named `:id`, `:ownerId`, and `:appId` are UUID v4 values.

Example:

```text
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## Users

<details>
<summary>Show user endpoints</summary>

### Create User

```http
POST /api/users
```

Creates a WatchTower user.

#### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes | User display/login name. Trimmed before storage. |
| `email` | string | Yes | User email address. Trimmed and lowercased before storage. |
| `passwordHash` | string | Yes | Hashed password value. Not returned in API responses. |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "anaya",
    "email": "ANAYA@example.com",
    "passwordHash": "hashed-password"
  }'
```

#### Example Response

```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "anaya",
    "email": "anaya@example.com",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `201` | User created. |
| `400` | Invalid payload, such as a missing `username`, `email`, or `passwordHash`. |

### Get User

```http
GET /api/users/:id
```

Fetches a user by ID. The response does not include `passwordHash`.

#### Example Request

```bash
curl http://localhost:3000/api/users/00000000-0000-0000-0000-000000000001
```

#### Example Response

```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "anaya",
    "email": "anaya@example.com",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | User found. |
| `404` | User not found. |

### Update User

```http
PATCH /api/users/:id
```

Updates an existing user. Only `username`, `email`, and `passwordHash` are accepted. Other fields are ignored.

#### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | No | New username. |
| `email` | string | No | New email address. |
| `passwordHash` | string | No | New hashed password value. Not returned in API responses. |

#### Example Request

```bash
curl -X PATCH http://localhost:3000/api/users/00000000-0000-0000-0000-000000000001 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "updated-owner",
    "role": "admin"
  }'
```

#### Example Response

```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "updated-owner",
    "email": "anaya@example.com",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:10:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | User updated. |
| `400` | Invalid update payload. |
| `404` | User not found or no allowed update fields were supplied. |

### Delete User

```http
DELETE /api/users/:id
```

Deletes a user by ID. The deleted user is returned without `passwordHash`.

#### Example Request

```bash
curl -X DELETE http://localhost:3000/api/users/00000000-0000-0000-0000-000000000001
```

#### Example Response

```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "anaya",
    "email": "anaya@example.com",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | User deleted. |
| `404` | User not found. |

</details>

## Apps

<details>
<summary>Show app endpoints</summary>

### Create App

```http
POST /api/apps
```

Creates an app owned by a user. The backend generates an `apiKey`, but creation responses do not expose it.

#### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ownerId` | UUID string | Yes | ID of the user who owns the app. |
| `name` | string | Yes | App display name. Trimmed before storage. |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/apps \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "name": "WatchTower Web"
  }'
```

#### Example Response

```json
{
  "app": {
    "id": "00000000-0000-0000-0000-000000000002",
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "name": "WatchTower Web",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `201` | App created. |
| `400` | Invalid `ownerId` or missing/invalid `name`. |

### Get App

```http
GET /api/apps/:id
```

Fetches an app by ID. The response does not include `apiKey`.

#### Example Request

```bash
curl http://localhost:3000/api/apps/00000000-0000-0000-0000-000000000002
```

#### Example Response

```json
{
  "app": {
    "id": "00000000-0000-0000-0000-000000000002",
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "name": "WatchTower Web",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | App found. |
| `404` | App not found. |

### List Apps By Owner

```http
GET /api/apps/users/:ownerId
```

Lists all apps owned by a user.

#### Example Request

```bash
curl http://localhost:3000/api/apps/users/00000000-0000-0000-0000-000000000001
```

#### Example Response

```json
{
  "apps": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "ownerId": "00000000-0000-0000-0000-000000000001",
      "name": "WatchTower Web",
      "createdAt": "2026-05-14T07:00:00.000Z",
      "updatedAt": "2026-05-14T07:00:00.000Z"
    }
  ]
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Apps returned. Unknown owner IDs return an empty `apps` array. |

### Delete App

```http
DELETE /api/apps/:id
```

Deletes an app by ID. The deleted app is returned without `apiKey`.

#### Example Request

```bash
curl -X DELETE http://localhost:3000/api/apps/00000000-0000-0000-0000-000000000002
```

#### Example Response

```json
{
  "app": {
    "id": "00000000-0000-0000-0000-000000000002",
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "name": "WatchTower Web",
    "createdAt": "2026-05-14T07:00:00.000Z",
    "updatedAt": "2026-05-14T07:00:00.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | App deleted. |
| `404` | App not found. |

</details>

## Error Events

<details>
<summary>Show error event endpoints</summary>

### Create Error Event

```http
POST /api/events/error
```

Creates an error event for an app. This endpoint authenticates ingestion with the app `apiKey`.

#### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | string | Yes | App ingestion key. |
| `message` | string | Yes | Error message. |
| `stack` | string | No | Error stack trace. |
| `url` | string | No | Page or endpoint where the error happened. |
| `errorType` | string | No | Error class or category. |
| `severity` | string | No | Severity label such as `low`, `medium`, or `high`. |
| `release` | string | No | App release or version. |
| `timestamp` | ISO date string | No | Event occurrence time. Defaults to current time. |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/events/error \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "app-api-key",
    "message": "Something broke",
    "stack": "Error: Something broke",
    "url": "https://example.com/dashboard",
    "errorType": "Error",
    "severity": "high",
    "release": "1.0.0",
    "timestamp": "2026-05-14T07:00:00.000Z"
  }'
```

#### Example Response

```json
{
  "event": {
    "id": "00000000-0000-0000-0000-000000000003",
    "appId": "00000000-0000-0000-0000-000000000002",
    "type": "error",
    "timestamp": "2026-05-14T07:00:00.000Z",
    "url": "https://example.com/dashboard",
    "metadata": {
      "message": "Something broke",
      "stack": "Error: Something broke",
      "errorType": "Error",
      "severity": "high",
      "release": "1.0.0"
    },
    "receivedAt": "2026-05-14T07:00:01.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `201` | Error event created. |
| `400` | Missing `apiKey` or `message`, or another validation error occurred. |
| `401` | Invalid `apiKey`. |

### Get Error Event

```http
GET /api/events/error/:id
```

Fetches an error event by ID. If the event exists but is not an error event, the endpoint returns `404`.

#### Example Request

```bash
curl http://localhost:3000/api/events/error/00000000-0000-0000-0000-000000000003
```

#### Example Response

```json
{
  "event": {
    "id": "00000000-0000-0000-0000-000000000003",
    "appId": "00000000-0000-0000-0000-000000000002",
    "type": "error",
    "timestamp": "2026-05-14T07:00:00.000Z",
    "url": "https://example.com/dashboard",
    "metadata": {
      "message": "Something broke"
    },
    "receivedAt": "2026-05-14T07:00:01.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Error event found. |
| `404` | Error event not found, or the event is a different type. |

### List Error Events By App

```http
GET /api/events/error/apps/:appId
```

Lists all error events for an app.

#### Example Request

```bash
curl http://localhost:3000/api/events/error/apps/00000000-0000-0000-0000-000000000002
```

#### Example Response

```json
{
  "events": [
    {
      "id": "00000000-0000-0000-0000-000000000003",
      "appId": "00000000-0000-0000-0000-000000000002",
      "type": "error",
      "timestamp": "2026-05-14T07:00:00.000Z",
      "metadata": {
        "message": "Something broke"
      },
      "receivedAt": "2026-05-14T07:00:01.000Z"
    }
  ]
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Error events returned. Unknown app IDs return an empty `events` array. |

### Delete Error Event

```http
DELETE /api/events/error/:id
```

Deletes an error event by ID.

#### Example Request

```bash
curl -X DELETE http://localhost:3000/api/events/error/00000000-0000-0000-0000-000000000003
```

#### Example Response

```json
{
  "event": {
    "id": "00000000-0000-0000-0000-000000000003",
    "appId": "00000000-0000-0000-0000-000000000002",
    "type": "error",
    "timestamp": "2026-05-14T07:00:00.000Z",
    "metadata": {
      "message": "Something broke"
    },
    "receivedAt": "2026-05-14T07:00:01.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Error event deleted. |
| `404` | Error event not found, or the event is a different type. |

</details>

## Performance Events

<details>
<summary>Show performance event endpoints</summary>

### Create Performance Event

```http
POST /api/events/performance
```

Creates a performance event for an app. This endpoint authenticates ingestion with the app `apiKey`.

#### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | string | Yes | App ingestion key. |
| `loadTimeMs` | number | No | Full page load time in milliseconds. |
| `domContentLoadedMs` | number | No | DOMContentLoaded timing in milliseconds. |
| `ttfbMs` | number | No | Time to first byte in milliseconds. |
| `apiEndpoint` | string | No | API endpoint being measured. |
| `apiLatencyMs` | number | No | API latency in milliseconds. |
| `memoryMB` | number | No | Memory usage in megabytes. |
| `url` | string | No | Page or endpoint where the metric was captured. |
| `release` | string | No | App release or version. |
| `timestamp` | ISO date string | No | Event occurrence time. Defaults to current time. |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/events/performance \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "app-api-key",
    "loadTimeMs": 1200,
    "domContentLoadedMs": 800,
    "ttfbMs": 100,
    "apiEndpoint": "/api/widgets",
    "apiLatencyMs": 250,
    "memoryMB": 64,
    "url": "https://example.com/dashboard",
    "release": "1.0.0",
    "timestamp": "2026-05-14T07:00:00.000Z"
  }'
```

#### Example Response

```json
{
  "event": {
    "id": "00000000-0000-0000-0000-000000000004",
    "appId": "00000000-0000-0000-0000-000000000002",
    "type": "performance",
    "timestamp": "2026-05-14T07:00:00.000Z",
    "url": "https://example.com/dashboard",
    "metadata": {
      "loadTimeMs": 1200,
      "domContentLoadedMs": 800,
      "ttfbMs": 100,
      "apiEndpoint": "/api/widgets",
      "apiLatencyMs": 250,
      "memoryMB": 64,
      "release": "1.0.0"
    },
    "receivedAt": "2026-05-14T07:00:01.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `201` | Performance event created. |
| `400` | Missing `apiKey` or another validation error occurred. |
| `401` | Invalid `apiKey`. |

### Get Performance Event

```http
GET /api/events/performance/:id
```

Fetches a performance event by ID. If the event exists but is not a performance event, the endpoint returns `404`.

#### Example Request

```bash
curl http://localhost:3000/api/events/performance/00000000-0000-0000-0000-000000000004
```

#### Example Response

```json
{
  "event": {
    "id": "00000000-0000-0000-0000-000000000004",
    "appId": "00000000-0000-0000-0000-000000000002",
    "type": "performance",
    "timestamp": "2026-05-14T07:00:00.000Z",
    "metadata": {
      "loadTimeMs": 1200
    },
    "receivedAt": "2026-05-14T07:00:01.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Performance event found. |
| `404` | Performance event not found, or the event is a different type. |

### List Performance Events By App

```http
GET /api/events/performance/apps/:appId
```

Lists all performance events for an app.

#### Example Request

```bash
curl http://localhost:3000/api/events/performance/apps/00000000-0000-0000-0000-000000000002
```

#### Example Response

```json
{
  "events": [
    {
      "id": "00000000-0000-0000-0000-000000000004",
      "appId": "00000000-0000-0000-0000-000000000002",
      "type": "performance",
      "timestamp": "2026-05-14T07:00:00.000Z",
      "metadata": {
        "loadTimeMs": 1200
      },
      "receivedAt": "2026-05-14T07:00:01.000Z"
    }
  ]
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Performance events returned. Unknown app IDs return an empty `events` array. |

### Delete Performance Event

```http
DELETE /api/events/performance/:id
```

Deletes a performance event by ID.

#### Example Request

```bash
curl -X DELETE http://localhost:3000/api/events/performance/00000000-0000-0000-0000-000000000004
```

#### Example Response

```json
{
  "event": {
    "id": "00000000-0000-0000-0000-000000000004",
    "appId": "00000000-0000-0000-0000-000000000002",
    "type": "performance",
    "timestamp": "2026-05-14T07:00:00.000Z",
    "metadata": {
      "loadTimeMs": 1200
    },
    "receivedAt": "2026-05-14T07:00:01.000Z"
  }
}
```

#### Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Performance event deleted. |
| `404` | Performance event not found, or the event is a different type. |

</details>
