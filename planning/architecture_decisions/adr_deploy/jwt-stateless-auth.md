---
title: Replace express-session with JWT cookies for stateless auth
status: accepted
date: 2026-06-03
decision-makers: Team seven ate nine
type: backend
---

# Deploy Decision: Replace express-session with JWT cookies for stateless auth

## Context and Problem Statement

WatchTower uses `express-session` to maintain login state across requests. The default MemoryStore keeps session data in the Node.js process's heap. Cloudflare Workers are stateless — no memory persists between requests or across isolates — so `express-session` cannot work in a deployed Worker.

How should login state be maintained in a stateless Cloudflare Workers environment while keeping the frontend login flow unchanged?

## Decision Drivers

* Auth state must survive across multiple Worker requests without server-side session storage.
* The frontend currently stores the user object in `localStorage` after login and reads it for client-side routing guards — this should not change.
* The backend `POST /login` response currently returns `{ user }` JSON — this should not change.
* The solution must work in both Node.js (local dev, Jest tests) and Cloudflare Workers.
* No additional infrastructure (KV, Durable Objects) should be required for basic auth.

## Considered Options

* JWT stored in an HttpOnly cookie (using `jose`)
* JWT stored in `localStorage` (no cookie)
* Cloudflare KV-backed session store

## Decision Outcome

Chosen option: "JWT stored in an HttpOnly cookie using `jose`", because it is stateless (no server-side storage), secure (HttpOnly prevents XSS access), and requires zero frontend changes — the `POST /login` response still returns `{ user }` JSON which the frontend stores in `localStorage` as before.

### Consequences

* Good, because the Worker verifies the JWT signature on each request using the `JWT_SECRET` — no storage lookup needed.
* Good, because the frontend login/signup flow is unchanged: POSTs credentials, receives `{ user }` JSON, stores in `localStorage`.
* Good, because `jose` is a pure-JS JOSE library that works in Node.js, Cloudflare Workers, and browsers.
* Good, because existing test assertions that check `set-cookie` header presence (not the cookie name) continue to pass without modification.
* Bad, because JWT rotation (changing `JWT_SECRET`) invalidates all existing user sessions simultaneously — acceptable for course-project scope.
* Bad, because the cookie name changes from `connect.sid` to `watchtower_token`; any code that reads the cookie by name must be updated (only internal auth middleware).
* Bad, because JWTs cannot be individually revoked without a blocklist — acceptable for course-project scope.

### Confirmation

* `POST /login` with valid credentials returns 200 and sets a `watchtower_token` HttpOnly cookie.
* `POST /login` with invalid credentials returns 401 and sets no cookie.
* `POST /logout` clears the `watchtower_token` cookie (`Max-Age=0`).
* `npm test` passes all session-related tests (cookie presence assertions are not cookie-name-specific).

## Implementation

### New file: `backend/util/auth.js`

```js
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'watchtower_token';

function secretKey(secret) {
  return new TextEncoder().encode(secret);
}

export async function signJwt(payload, secret) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(secret));
}

export async function verifyJwt(token, secret) {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    return payload;
  } catch {
    return null;
  }
}
```

### Cookie attributes

```
watchtower_token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

- `HttpOnly` — not accessible from JavaScript; prevents XSS token theft.
- `SameSite=Lax` — sent on same-origin navigations and API calls proxied through CF Pages; does not require `Secure` flag locally.
- `Max-Age=604800` — 7 days, matching the JWT `exp` claim.

### Required Wrangler secret

```bash
wrangler secret put JWT_SECRET
```

In `backend/dev.js` and `backend/util/auth.js`, the secret falls back to `process.env.JWT_SECRET` which is populated from `.env` for local dev.

## Pros and Cons of the Options

### JWT in HttpOnly cookie

* Good, because stateless — no server-side storage needed.
* Good, because HttpOnly prevents XSS access to the token.
* Good, because `jose` works in both Node.js and CF Workers.
* Bad, because token rotation invalidates all sessions.

### JWT in localStorage

* Good, because trivial to implement (just include token in response body).
* Bad, because localStorage is accessible to JavaScript — XSS can steal the token.
* Bad, because every `fetch()` call would need an `Authorization: Bearer` header added — requires frontend changes.

### Cloudflare KV-backed sessions

* Good, because sessions can be individually revoked.
* Bad, because KV adds infrastructure complexity and requires a paid CF plan for high read volume.
* Bad, because KV reads add latency to every authenticated request.
