/* eslint-env node */

import cron from 'node-cron';
import {
  createApp,
  deleteAppById,
  getAllAppsByOwnerId,
  getAppById,
} from '../controllers/appController.js';
import { selectAllApps, updateAppDownOrNot } from '../schema/appModel.js';
import { checkAndNotifyDowntime } from '../util/DowntimeNotificationEnsurer.js';

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

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', async () => {
    const allApps = await selectAllApps();
    for (const app of allApps) {
      if (app.url) {
        await checkDowntimeStatus(app.id);
        await checkAndNotifyDowntime(app.id);
      }
    }
  });
}

/**
 * Create a WatchTower app, then immediately run a downtime check if a url is provided.
 * @route POST /api/apps
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function createAppEndpoint(req, res) {
  try {
    const payload = req.fields || req.body;
    const app = await createApp(payload);
    const safeApp = app.toObject();
    delete safeApp.apiKey;

    if (safeApp.url) {
      await checkDowntimeStatus(safeApp.id);
      const updated = await getAppById(safeApp.id);
      res.status(201).json({ app: updated });
      return;
    }

    res.status(201).json({ app: safeApp });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ error: message });
  }
}

/**
 * Fetch an app by id.
 * @route GET /api/apps/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getAppEndpoint(req, res) {
  const app = await getAppById(req.params.id);

  if (!app) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  res.status(200).json({ app });
}

/**
 * Fetch all apps for a user.
 * @route GET /api/apps/users/:ownerId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getAppsByOwnerEndpoint(req, res) {
  const apps = await getAllAppsByOwnerId(req.params.ownerId);
  res.status(200).json({ apps });
}

/**
 * Delete an app by id.
 * @route DELETE /api/apps/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function deleteAppEndpoint(req, res) {
  const app = await deleteAppById(req.params.id);

  if (!app) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  const safeApp = app.toObject();
  delete safeApp.apiKey;

  res.status(200).json({ app: safeApp });
}

/**
 * Force-run a downtime check for an app without altering the cron schedule.
 * @route POST /api/apps/:id/forceStatus
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function forceStatusEndpoint(req, res) {
  try {
    const app = await getAppById(req.params.id);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }

    if (!app.url) {
      res.status(400).json({ error: 'App has no URL configured' });
      return;
    }

    const isUp = await checkDowntimeStatus(req.params.id);
    const updatedApp = await getAppById(req.params.id);

    res.status(200).json({ app: updatedApp, isUp });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: message });
  }
}

export {
  checkDowntimeStatus,
  createAppEndpoint,
  deleteAppEndpoint,
  forceStatusEndpoint,
  getAppEndpoint,
  getAppsByOwnerEndpoint,
};
