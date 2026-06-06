/* eslint-env node */

import { createApp } from './app.js';
import { initDb } from './util/database.js';
import { selectAllApps } from './schema/appModel.js';
import { checkDowntimeStatus } from './endpoints/apps.js';
import { checkAndNotifyDowntime } from './util/downtimeNotificationEnsurer.js';

const app = createApp();

// Initialised once per isolate lifetime; env is only available inside handlers.
let dbReady = false;

function ensureDb(env) {
  if (!dbReady) {
    initDb(env.DATABASE_URL);
    dbReady = true;
  }
}

export default {
  /**
   * Handle HTTP requests.
   * @param {Request} request
   * @param {object} env - CF Workers environment bindings (DATABASE_URL, JWT_SECRET, etc.)
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    ensureDb(env);
    const { pathname } = new URL(request.url);
    // API and auth routes go to Hono; everything else is served as a static asset
    const isApiRoute = pathname.startsWith('/api/') ||
      pathname === '/login' || pathname === '/signup' || pathname === '/logout';
    if (isApiRoute) return app.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },

  /**
   * Handle scheduled cron trigger (every 5 minutes).
   * Checks uptime for all apps and sends downtime/recovery emails as needed.
   * @param {ScheduledEvent} event
   * @param {object} env
   * @param {ExecutionContext} ctx
   */
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
      })(),
    );
  },
};
