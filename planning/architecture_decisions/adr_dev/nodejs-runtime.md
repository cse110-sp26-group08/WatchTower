---
title: Use Node.js as the backend runtime
status: accepted
date: 2026-05-10
decision-makers: Team seven ate nine
type: backend
---

# Backend Decision: Use Node.js as the backend runtime

## Context and Problem Statement

WatchTower needs a backend runtime to handle database work, serve pages, and support HTTP endpoints for data retrieval and data collection.

What runtime should the backend use to support the collector APIs and the rest of the application?

## Decision Drivers

* The backend needs to handle database access and page serving.
* The team wants to build data retrieval and collection endpoints.
* The team wants a technology it has already learned in labs.
* The runtime should be lightweight.
* Industry support and JavaScript ecosystem compatibility matter to the team.

## Considered Options

* Node.js
* Flask
* Django

## Decision Outcome

Chosen option: "Node.js", because the team has already learned Node.js in its labs, it is lightweight, and it provides stronger JavaScript ecosystem support than Flask or Django.

### Consequences

* Good, because Node.js can be used as the JavaScript runtime to handle database work and serving pages.
* Good, because Node.js supports HTTP endpoint frameworks for data retrieval and collection.
* Good, because the team already has familiarity with Node.js from labs.
* Good, because the team considers it lightweight and expects it not to slow down the user's website or application.
* Good, because the team views Node.js as the most used in industry among the compared options and sees wider support for JavaScript functionality.
* Bad, because the team is committing to a JavaScript-centric backend stack, which may narrow later backend choices.

### Confirmation

* The backend should be able to serve pages and expose HTTP endpoints.
* The backend should support database interactions needed by the project.
* The team should be able to implement the collector API and retrieval API within the Node.js runtime.

## Pros and Cons of the Options

### Node.js

Node.js is a JavaScript runtime used for backend APIs and page serving in local development and test environments.

* Good, because all team members have learned about Node.js in their labs.
* Good, because it is lightweight.
* Good, because the team expects it will not slow down the user's website or application.
* Good, because it has wide industry usage and wider support for JavaScript functionality.
* Good, because it works naturally with JavaScript HTTP frameworks.
* Bad, because choosing Node.js means the team is less likely to explore non-JavaScript backend stacks for this project.

### Flask

Flask is a Python web framework considered as a comparison point.

* Good, because it is a common backend framework.
* Bad, because the team preferred Node.js for stronger JavaScript alignment and industry familiarity.

### Django

Django is a larger Python web framework considered as a comparison point.

* Good, because it is a common backend framework.
* Bad, because the team preferred a lighter-weight runtime with stronger JavaScript ecosystem alignment.

## Post-migration Note (2026-06-03)

This ADR covers the **development-time runtime**. Node.js remains the runtime for:
- Local development (`node backend/dev.js`)
- Running Jest tests (via `@hono/node-server` adapter)
- Running `drizzle-kit` migrations

The **production deployment runtime** is Cloudflare Workers, which uses a V8-isolate-based Service Worker API rather than Node.js. See [`../adr_deploy/hono-cloudflare-workers.md`](../adr_deploy/hono-cloudflare-workers.md) for the deployment runtime decision.

The `nodejs_compat` compatibility flag in `wrangler.toml` exposes `process.env` and other Node.js globals in the Worker, so `database.js` and `drizzle.config.js` require no changes between environments. The language remains JavaScript throughout — only the runtime host changes between dev and deploy.
