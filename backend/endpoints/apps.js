/* eslint-env node */

import {
  createApp,
  deleteAppById,
  getAllAppsByOwnerId,
  getAppById,
  getAppByIdWithApiKey,
  updateAppById,
} from '../controllers/appController.js';
import { selectAllApps, updateAppDownOrNot } from '../schema/appModel.js';
import { removeEventsByAppId } from '../schema/eventModel.js';
import { checkAndNotifyDowntime } from '../util/downtimeNotificationEnsurer.js';

/**
 * Check whether a website is up by making an HTTP GET request.
 * Updates the app's downOrNot list in the database only when the status changes.
 * The list is capped at 3 entries (oldest removed first).
 *
 * @param {string} appId - UUID of the app to check
 * @returns {Promise<boolean|null>} true if up, false if down, null if app/url not found
 */
async function checkDowntimeStatus(appId) {
  const app = await getAppById(appId);
  if (!app || !app.url) return null;

  let isUp;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(app.url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    isUp = response.status >= 200 && response.status < 400;
  } catch {
    isUp = false;
  }

  const downOrNot = Array.isArray(app.downOrNot) ? app.downOrNot : [];
  const next = [...downOrNot, isUp];
  if (next.length > 3) next.shift();

  const arrayChanged =
    next.length !== downOrNot.length || next.some((v, i) => v !== downOrNot[i]);

  if (arrayChanged) {
    await updateAppDownOrNot(appId, next);
  }

  return isUp;
}

/**
 * Create a WatchTower app, then immediately run a downtime check if a url is provided.
 * @route POST /api/apps
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function createAppEndpoint(c) {
  try {
    const payload = await c.req.json();
    const app = await createApp(payload);
    const safeApp = app.toObject();
    delete safeApp.apiKey;

    if (safeApp.url) {
      await checkDowntimeStatus(safeApp.id);
      const updated = await getAppById(safeApp.id);
      return c.json({ app: updated }, 201);
    }

    return c.json({ app: safeApp }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 400);
  }
}

/**
 * Fetch an app by id.
 * @route GET /api/apps/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getAppEndpoint(c) {
  const app = await getAppById(c.req.param('id'));

  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  return c.json({ app }, 200);
}

/**
 * Fetch all apps for a user.
 * @route GET /api/apps/users/:ownerId
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getAppsByOwnerEndpoint(c) {
  const apps = await getAllAppsByOwnerId(c.req.param('ownerId'));
  return c.json({ apps }, 200);
}

/**
 * Delete an app by id, along with all its associated events.
 * @route DELETE /api/apps/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function deleteAppEndpoint(c) {
  const existing = await getAppById(c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'App not found' }, 404);
  }

  await removeEventsByAppId(c.req.param('id'));
  const app = await deleteAppById(c.req.param('id'));

  const safeApp = app.toObject();
  delete safeApp.apiKey;

  return c.json({ app: safeApp }, 200);
}

/**
 * Return the API key for an app.
 * @route GET /api/apps/:id/apikey
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getAppApiKeyEndpoint(c) {
  const app = await getAppByIdWithApiKey(c.req.param('id'));

  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  return c.json({ apiKey: app.apiKey }, 200);
}

/**
 * Update the name and/or url of an app.
 * @route PATCH /api/apps/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function updateAppEndpoint(c) {
  try {
    const payload = await c.req.json();
    const app = await updateAppById(c.req.param('id'), payload);

    if (!app) {
      return c.json({ error: 'App not found' }, 404);
    }

    return c.json({ app }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 400);
  }
}

/**
 * Force-run a downtime check for an app without altering the cron schedule.
 * @route POST /api/apps/:id/forceStatus
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function forceStatusEndpoint(c) {
  try {
    const app = await getAppById(c.req.param('id'));
    if (!app) {
      return c.json({ error: 'App not found' }, 404);
    }

    if (!app.url) {
      return c.json({ error: 'App has no URL configured' }, 400);
    }

    const isUp = await checkDowntimeStatus(c.req.param('id'));
    const updatedApp = await getAppById(c.req.param('id'));

    return c.json({ app: updatedApp, isUp }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 500);
  }
}

export {
  checkDowntimeStatus,
  createAppEndpoint,
  deleteAppEndpoint,
  forceStatusEndpoint,
  getAppApiKeyEndpoint,
  getAppEndpoint,
  getAppsByOwnerEndpoint,
  updateAppEndpoint,
};
