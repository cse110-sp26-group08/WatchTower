---
title: Use Hono.js on Cloudflare Workers for API deployment
status: accepted
date: 2026-06-03
decision-makers: Team seven ate nine
type: backend
---

# Deploy Decision: Use Hono.js on Cloudflare Workers for API deployment

## Context and Problem Statement

The course requirement states that all server-side technologies must run on Cloudflare or GitHub Pages. GitHub Pages is static-only, so the backend must target Cloudflare Workers.

Express.js cannot run on Cloudflare Workers because it depends on Node.js's `http.createServer()` API, which is not available in the Workers V8-isolate runtime — even with the `nodejs_compat` flag. `express-session`, `express-formidable`, and `node-cron` have the same Node.js-only constraint.

What HTTP framework should replace Express for Cloudflare Workers deployment while keeping the codebase as close to the original as possible?

## Decision Drivers

* The framework must run natively on Cloudflare Workers.
* The framework must also run on Node.js via an adapter, so local development and Jest tests continue to work without wrangler.
* The routing API should be as similar to Express as possible to minimize changes to endpoint handler code.
* The framework should be actively maintained and widely used in the CF Workers ecosystem.

## Considered Options

* Hono.js
* itty-router
* Rewrite to raw `fetch` handler (no framework)

## Decision Outcome

Chosen option: "Hono.js", because it has an Express-compatible routing API (`app.get`, `app.post`, `app.use`), first-class Cloudflare Workers support, and an official Node.js adapter (`@hono/node-server`) that makes it a drop-in target for the existing Jest test suite via `supertest`.

### Consequences

* Good, because Hono's routing API (`app.get('/path', handler)`) mirrors Express closely — route registrations in `app.js` are nearly unchanged.
* Good, because `@hono/node-server` lets all existing Jest tests run against the Hono app without wrangler, preserving the test workflow.
* Good, because `c.env` inside Hono handlers exposes the Cloudflare Workers `env` bindings (secrets, KV, etc.) without any extra wiring.
* Good, because `bcrypt` (native bindings) is replaced by `bcryptjs` (pure JS, identical API) as a direct consequence of targeting the Workers runtime — no logic changes needed.
* Bad, because all endpoint handler signatures change from Express `(req, res)` to Hono context `(c)` — this is mechanical but touches every endpoint file.
* Bad, because `express-formidable` body parsing is removed; body parsing becomes `await c.req.json()` (acceptable since the frontend already sends JSON).
* Bad, because static file serving moves out of the backend entirely into CF Pages (see [`cloudflare-pages-frontend.md`](./cloudflare-pages-frontend.md)).

### Confirmation

* `wrangler dev` should start the Worker locally on port 8787 with all API routes responding correctly.
* `npm test` should pass all tests using `createAdaptorServer(createApp())` from `@hono/node-server`.
* The Worker entry point (`backend/worker.js`) exports a default object with `fetch` and `scheduled` handlers.

## Pros and Cons of the Options

### Hono.js

* Good, because it is the most widely adopted framework for Cloudflare Workers.
* Good, because its routing API is nearly identical to Express.
* Good, because `@hono/node-server` provides a high-fidelity Node.js adapter.
* Bad, because handler context (`c`) differs from Express's `(req, res)` — requires touching each endpoint file.

### itty-router

* Good, because it is extremely lightweight.
* Bad, because it has a less Express-like API and fewer built-in helpers (CORS, cookies, body parsing).
* Bad, because it lacks an official Node.js adapter for test compatibility.

### Raw `fetch` handler

* Good, because zero dependency overhead.
* Bad, because routing, middleware, CORS, and body parsing must all be hand-rolled.
* Bad, because the resulting code would be much harder to maintain.

## Migration Notes

### Package changes
- Remove: `express`, `express-session`, `express-formidable`, `node-cron`, `bcrypt`, `cors`
- Add: `hono` ^4.7.0, `@hono/node-server` ^1.14.0, `bcryptjs` ^3.0.2
- Move to devDependencies: `dotenv` (not needed at runtime in Workers)

### Endpoint handler signature change pattern
```js
// Before (Express)
async function getAppEndpoint(req, res) {
  const app = await getAppById(req.params.id);
  if (!app) { res.status(404).json({ error: 'Not found' }); return; }
  res.status(200).json({ app });
}

// After (Hono)
async function getAppEndpoint(c) {
  const app = await getAppById(c.req.param('id'));
  if (!app) return c.json({ error: 'Not found' }, 404);
  return c.json({ app }, 200);
}
```

### Files unchanged by this migration
All business logic in `backend/controllers/`, `backend/schema/`, `backend/util/database.js`, `backend/util/downtimeNotificationEnsurer.js`, `backend/migrations/`, and all `frontend/` files are unaffected.
