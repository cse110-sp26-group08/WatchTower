/* eslint-env node */

import {
  createEvent,
  deleteEventById,
  getAllEventsByAppId,
  getEventById,
} from '../controllers/eventController.js';
import { getAppByApiKey } from '../controllers/appController.js';

/**
 * Collect error event data from a monitored application.
 * @route POST /api/events/error
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function createErrorEndpoint(req, res) {
  try {
    const payload = req.fields || req.body;
    const { apiKey, message, stack, url, errorType, severity, release, timestamp } = payload;

    if (!apiKey || !message) {
      res.status(400).json({ error: 'apiKey and message are required' });
      return;
    }

    const app = await getAppByApiKey(apiKey);
    if (!app) {
      res.status(401).json({ error: 'Invalid apiKey' });
      return;
    }

    const event = await createEvent({
      appId: app._id,
      type: 'error',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      url,
      metadata: {
        message,
        stack,
        errorType,
        severity,
        release,
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ error: message });
  }
}

/**
 * Fetch an error event by id.
 * @route GET /api/events/error/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getErrorEndpoint(req, res) {
  const event = await getEventById(req.params.id);

  if (!event || event.type !== 'error') {
    res.status(404).json({ error: 'Error event not found' });
    return;
  }

  res.status(200).json({ event });
}

/**
 * Fetch all error events for an app.
 * @route GET /api/events/error/apps/:appId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getErrorsByAppEndpoint(req, res) {
  const events = await getAllEventsByAppId(req.params.appId);
  res.status(200).json({ events: events.filter((event) => event.type === 'error') });
}

/**
 * Delete an error event by id.
 * @route DELETE /api/events/error/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function deleteErrorEndpoint(req, res) {
  const event = await getEventById(req.params.id);

  if (!event || event.type !== 'error') {
    res.status(404).json({ error: 'Error event not found' });
    return;
  }

  const deletedEvent = await deleteEventById(req.params.id);
  res.status(200).json({ event: deletedEvent });
}

export { createErrorEndpoint, deleteErrorEndpoint, getErrorEndpoint, getErrorsByAppEndpoint };
