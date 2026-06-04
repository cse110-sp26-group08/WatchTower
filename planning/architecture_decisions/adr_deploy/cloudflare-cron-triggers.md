---
title: Use Cloudflare Cron Triggers for uptime monitoring
status: accepted
date: 2026-06-03
decision-makers: Team seven ate nine
type: backend
---

# Deploy Decision: Use Cloudflare Cron Triggers for uptime monitoring

## Context and Problem Statement

WatchTower checks each monitored app's uptime every 5 minutes using a `node-cron` schedule in `backend/endpoints/apps.js`. This approach requires a persistent Node.js process. Cloudflare Workers are stateless and have no persistent process, so `node-cron` cannot run in a deployed Worker.

How should the recurring uptime check be scheduled in a Cloudflare Workers deployment?

## Decision Drivers

* The uptime check must run every 5 minutes regardless of user activity.
* The scheduling mechanism must work within the Cloudflare Workers runtime.
* The underlying `checkDowntimeStatus` and `checkAndNotifyDowntime` business logic functions must not change.
* Local development should still support triggering the check manually for testing.

## Considered Options

* Cloudflare Cron Triggers (Workers `scheduled` export)
* External cron service hitting a Workers endpoint (e.g., cron-job.org)
* Cloudflare Durable Objects with alarms

## Decision Outcome

Chosen option: "Cloudflare Cron Triggers", because it is the native CF Workers scheduling mechanism, requires only adding a `[[triggers]]` entry to `wrangler.toml` and a `scheduled` export to the Worker entry point, and the existing business logic functions are called unchanged.

### Consequences

* Good, because the cron schedule (`*/5 * * * *`) is declared in `wrangler.toml` alongside the Worker config — no external service dependency.
* Good, because the `checkDowntimeStatus` and `checkAndNotifyDowntime` functions in `apps.js` and `downtimeNotificationEnsurer.js` are entirely unchanged.
* Good, because `wrangler dev` exposes `GET /__scheduled?cron=*/5+*+*+*+*` for manually triggering the scheduled handler during local development.
* Good, because `ctx.waitUntil()` in the `scheduled` handler ensures async downtime checks complete before the Worker isolate is recycled.
* Bad, because the minimum cron resolution on Cloudflare Workers is 1 minute (same as `node-cron` — no regression).
* Bad, because the `node-cron` block in `apps.js` is deleted entirely; developers running `node backend/dev.js` locally will not have automatic uptime polling unless they trigger `/__scheduled` manually or use `wrangler dev`.

### Confirmation

* `wrangler dev` starts and `curl "localhost:8787/__scheduled?cron=*/5+*+*+*+*"` returns 200.
* CF dashboard shows the cron trigger firing at the configured interval after deployment.
* `checkDowntimeStatus` and `checkAndNotifyDowntime` are called for every app with a URL during each cron execution.

## Scheduled handler implementation (in `backend/worker.js`)

```js
async scheduled(event, env, ctx) {
  ensureDb(env);
  ctx.waitUntil(
    (async () => {
      const allApps = await selectAllApps();
      for (const monitoredApp of allApps) {
        if (monitoredApp.url) {
          await checkDowntimeStatus(monitoredApp.id);
          await checkAndNotifyDowntime(monitoredApp.id);
        }
      }
    })()
  );
},
```

## `wrangler.toml` entry

```toml
[[triggers]]
crons = ["*/5 * * * *"]
```

## Pros and Cons of the Options

### Cloudflare Cron Triggers

* Good, because it is the native CF Workers scheduling mechanism.
* Good, because configuration lives in `wrangler.toml` alongside the rest of the Worker config.
* Good, because no external service dependency or authentication required.
* Bad, because scheduling is managed by CF infrastructure, not application code — less visible to developers unfamiliar with wrangler.

### External cron service

* Good, because it can be used with any hosting, not just CF Workers.
* Bad, because it requires a separate service account and adds an external dependency.
* Bad, because the endpoint would need to be authenticated to prevent unauthorized triggering.

### Cloudflare Durable Objects with alarms

* Good, because it provides fine-grained per-object scheduling (e.g., per-app checks).
* Bad, because Durable Objects add significant architectural complexity for what is currently a simple periodic batch job.
* Bad, because Durable Objects require a paid CF plan.
