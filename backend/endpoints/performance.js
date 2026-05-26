/* eslint-env node */

import {
  createEvent,
  deleteEventById,
  getAllEventsByAppId,
  getEventById,
} from '../controllers/eventController.js';
import { getAppByApiKey } from '../controllers/appController.js';

/**
 * Collect performance metric data from a monitored application.
 * @route POST /api/events/performance
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function createPerformanceEndpoint(req, res) {
  try {
    const payload = req.fields || req.body;
    const {
      apiKey,
      loadTimeMs,
      domContentLoadedMs,
      ttfbMs,
      apiEndpoint,
      apiLatencyMs,
      memoryMB,
      url,
      release,
      timestamp,
    } = payload;

    if (!apiKey) {
      res.status(400).json({ error: 'apiKey is required' });
      return;
    }

    const app = await getAppByApiKey(apiKey);
    if (!app) {
      res.status(401).json({ error: 'Invalid apiKey' });
      return;
    }

    const event = await createEvent({
      appId: app._id,
      type: 'performance',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      url,
      metadata: {
        loadTimeMs,
        domContentLoadedMs,
        ttfbMs,
        apiEndpoint,
        apiLatencyMs,
        memoryMB,
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
 * Fetch a performance event by id.
 * @route GET /api/events/performance/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getPerformanceEndpoint(req, res) {
  const event = await getEventById(req.params.id);

  if (!event || event.type !== 'performance') {
    res.status(404).json({ error: 'Performance event not found' });
    return;
  }

  res.status(200).json({ event });
}

/**
 * Fetch all performance events for an app.
 * @route GET /api/events/performance/apps/:appId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getPerformanceByAppEndpoint(req, res) {
  const events = await getAllEventsByAppId(req.params.appId);
  res.status(200).json({ events: events.filter((event) => event.type === 'performance') });
}

/**
 * Delete a performance event by id.
 * @route DELETE /api/events/performance/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function deletePerformanceEndpoint(req, res) {
  const event = await getEventById(req.params.id);

  if (!event || event.type !== 'performance') {
    res.status(404).json({ error: 'Performance event not found' });
    return;
  }

  const deletedEvent = await deleteEventById(req.params.id);
  res.status(200).json({ event: deletedEvent });
}

export {
  createPerformanceEndpoint,
  deletePerformanceEndpoint,
  getPerformanceByAppEndpoint,
  getPerformanceEndpoint,
};
