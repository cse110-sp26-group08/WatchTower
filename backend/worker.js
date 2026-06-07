/* eslint-env node */

import { createApp } from './app.js';
import { initDb } from './util/database.js';
import { selectAllApps } from './schema/appModel.js';
import { checkDowntimeStatus } from './endpoints/apps.js';
import { checkAndNotifyDowntime } from './util/downtimeNotificationEnsurer.js';
import { initializeEmailService } from './util/emailService.js';

const app = createApp();

// Initialised once per isolate lifetime; env is only available inside handlers.
let dbReady = false;
let emailReady = false;

function ensureDb(env) {
  if (!dbReady) {
    initDb(env.DATABASE_URL);
    dbReady = true;
  }
}

function ensureEmail(env) {
  if (!emailReady && env.SENDGRID_API_KEY) {
    initializeEmailService(env.SENDGRID_API_KEY);
    emailReady = true;
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
    ensureEmail(env);
    return app.fetch(request, env, ctx);
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
    ensureEmail(env);
    ctx.waitUntil(
      (async () => {
        const allApps = await selectAllApps();
        for (const monitoredApp of allApps) {
          if (!monitoredApp.url) continue;
          try {
            await checkDowntimeStatus(monitoredApp.id);
          } catch (err) {
            console.error(`checkDowntimeStatus failed for app ${monitoredApp.id}:`, err);
          }
          try {
            await checkAndNotifyDowntime(monitoredApp.id);
          } catch (err) {
            console.error(`checkAndNotifyDowntime failed for app ${monitoredApp.id}:`, err);
          }
        }
      })(),
    );
  },
};
