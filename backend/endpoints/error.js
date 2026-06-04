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
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function createErrorEndpoint(c) {
  try {
    const payload = await c.req.json();
    const { apiKey, message, stack, url, errorType, severity, release, timestamp } = payload;

    if (!apiKey || !message) {
      return c.json({ error: 'apiKey and message are required' }, 400);
    }

    const app = await getAppByApiKey(apiKey);
    if (!app) {
      return c.json({ error: 'Invalid apiKey' }, 401);
    }

    const event = await createEvent({
      appId: app.id,
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

    return c.json({ event }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 400);
  }
}

/**
 * Fetch an error event by id.
 * @route GET /api/events/error/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getErrorEndpoint(c) {
  const event = await getEventById(c.req.param('id'));

  if (!event || event.type !== 'error') {
    return c.json({ error: 'Error event not found' }, 404);
  }

  return c.json({ event }, 200);
}

/**
 * Fetch all error events for an app.
 * @route GET /api/events/error/apps/:appId
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getErrorsByAppEndpoint(c) {
  const events = await getAllEventsByAppId(c.req.param('appId'));
  return c.json({ events: events.filter((event) => event.type === 'error') }, 200);
}

/**
 * Delete an error event by id.
 * @route DELETE /api/events/error/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function deleteErrorEndpoint(c) {
  const event = await getEventById(c.req.param('id'));

  if (!event || event.type !== 'error') {
    return c.json({ error: 'Error event not found' }, 404);
  }

  const deletedEvent = await deleteEventById(c.req.param('id'));
  return c.json({ event: deletedEvent }, 200);
}

export { createErrorEndpoint, deleteErrorEndpoint, getErrorEndpoint, getErrorsByAppEndpoint };
