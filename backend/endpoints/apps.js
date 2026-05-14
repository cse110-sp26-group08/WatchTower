/* eslint-env node */

import {
  createApp,
  deleteAppById,
  getAllAppsByOwnerId,
  getAppById,
} from '../controllers/appController.js';

/**
 * Create a WatchTower app.
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

export { createAppEndpoint, deleteAppEndpoint, getAppEndpoint, getAppsByOwnerEndpoint };
