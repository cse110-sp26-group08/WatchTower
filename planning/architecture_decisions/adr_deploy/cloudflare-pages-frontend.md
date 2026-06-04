---
title: Use Cloudflare Pages for frontend deployment
status: accepted
date: 2026-06-03
decision-makers: Team seven ate nine
type: frontend
---

# Deploy Decision: Use Cloudflare Pages for frontend deployment

## Context and Problem Statement

With the backend migrated to Cloudflare Workers (see [`hono-cloudflare-workers.md`](./hono-cloudflare-workers.md)), the frontend static files can no longer be served by Express's `express.static()` middleware. A separate hosting solution is needed for the HTML, CSS, and JavaScript files in `frontend/`.

The frontend has no build step — it is plain HTML/CSS/JS. How should it be hosted while keeping all frontend API calls working without URL changes?

## Decision Drivers

* The frontend is already pure static HTML/CSS/JS with no build tooling required.
* All frontend `fetch()` calls use relative paths (e.g., `/api/apps/${id}`) — changing them to absolute URLs would require editing multiple frontend JS files.
* The JWT cookie set by the Worker must be readable by the browser on the same origin; cross-origin cookies would require `SameSite=None; Secure` and `withCredentials: true` on every `fetch` call.
* Hosting should be free and deploy automatically from the Git repository.

## Considered Options

* Cloudflare Pages with `_redirects` proxy rules
* Cloudflare Pages with a separate API subdomain (different origin)
* GitHub Pages (static only; cannot proxy to the Worker)

## Decision Outcome

Chosen option: "Cloudflare Pages with `_redirects` proxy rules", because it serves the `frontend/` directory as-is with zero build configuration, and the `_redirects` file can proxy `/api/*`, `/login`, `/signup`, and `/logout` to the Worker — making all requests appear same-origin to the browser and preserving the existing relative-URL fetch calls in every frontend JS file.

### Consequences

* Good, because no frontend JS files change — all relative `fetch('/api/...')` calls continue to work.
* Good, because JWT cookies work without `SameSite=None` since all requests appear same-origin through the Pages proxy.
* Good, because CF Pages deploys automatically from the `main` branch with zero config.
* Good, because clean paths like `/login`, `/apps`, `/dashboard` are handled via `_redirects` rewrites without a build step.
* Bad, because CF Pages proxy rules (`200` status with external URL target) require a paid plan or may have rate limits; fallback is to use Workers Routes on a custom domain instead.
* Bad, because the Worker must still configure CORS for the Pages origin defensively, in case direct browser requests bypass the proxy.

### Confirmation

* `https://watchtower-frontend.pages.dev/` should load the homepage.
* `https://watchtower-frontend.pages.dev/login` should load the login page (rewritten from `/webpages/login.html`).
* Login flow should set a `watchtower_token` cookie and redirect to `/apps` successfully.
* Dashboard fetch calls should reach the Worker via the proxy and return real data.

## `_redirects` file (placed in `frontend/`)

```
# Proxy auth and API routes to the Worker (keeps same-origin for cookies)
/api/*   https://watchtower-backend.YOUR_ACCOUNT.workers.dev/api/:splat   200
/login   https://watchtower-backend.YOUR_ACCOUNT.workers.dev/login         200
/signup  https://watchtower-backend.YOUR_ACCOUNT.workers.dev/signup        200
/logout  https://watchtower-backend.YOUR_ACCOUNT.workers.dev/logout        200

# Rewrite clean paths to HTML files
/apps                         /webpages/app_selection.html              200
/dashboard                    /webpages/dashboard.html                  200
/settings                     /webpages/settings.html                   200
/advanced-performance-metrics /webpages/advanced_performance_metrics.html  200
/advanced-error-metrics       /webpages/advanced_error_metrics.html     200
/docs                         /webpages/docs.html                       200
```

## Pros and Cons of the Options

### Cloudflare Pages with `_redirects` proxy rules

* Good, because zero build config — deploy the `frontend/` directory directly.
* Good, because same-origin proxy keeps JWT cookies and fetch calls working unchanged.
* Bad, because proxy rules require CF Pages Pro or may have limits.

### Cloudflare Pages with separate API subdomain

* Good, because simpler Pages config (no proxy rules needed).
* Bad, because cross-origin cookies require `SameSite=None; Secure` and `withCredentials: true` on every frontend `fetch()` call — touching multiple frontend JS files.

### GitHub Pages

* Good, because it's free and integrates with GitHub Actions.
* Bad, because it cannot proxy requests to the Worker — browser would need absolute URLs and CORS handling.
* Bad, because the course requirement says server-side technologies must run on Cloudflare, making GitHub Pages viable for static assets only and not for the Worker proxy pattern.
