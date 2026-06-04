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
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function createPerformanceEndpoint(c) {
  try {
    const payload = await c.req.json();
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
      return c.json({ error: 'apiKey is required' }, 400);
    }

    const app = await getAppByApiKey(apiKey);
    if (!app) {
      return c.json({ error: 'Invalid apiKey' }, 401);
    }

    const event = await createEvent({
      appId: app.id,
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

    return c.json({ event }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 400);
  }
}

/**
 * Fetch a performance event by id.
 * @route GET /api/events/performance/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getPerformanceEndpoint(c) {
  const event = await getEventById(c.req.param('id'));

  if (!event || event.type !== 'performance') {
    return c.json({ error: 'Performance event not found' }, 404);
  }

  return c.json({ event }, 200);
}

/**
 * Fetch all performance events for an app.
 * @route GET /api/events/performance/apps/:appId
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getPerformanceByAppEndpoint(c) {
  const events = await getAllEventsByAppId(c.req.param('appId'));
  return c.json({ events: events.filter((event) => event.type === 'performance') }, 200);
}

/**
 * Delete a performance event by id.
 * @route DELETE /api/events/performance/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function deletePerformanceEndpoint(c) {
  const event = await getEventById(c.req.param('id'));

  if (!event || event.type !== 'performance') {
    return c.json({ error: 'Performance event not found' }, 404);
  }

  const deletedEvent = await deleteEventById(c.req.param('id'));
  return c.json({ event: deletedEvent }, 200);
}

export {
  createPerformanceEndpoint,
  deletePerformanceEndpoint,
  getPerformanceByAppEndpoint,
  getPerformanceEndpoint,
};
