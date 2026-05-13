/* eslint-env node */

import { createEvent } from '../controllers/eventController.js';

/**
 * @typedef {object} CollectErrorPayload
 * @property {string} appId - Application ID associated with the event.
 * @property {string} message - Error message.
 * @property {string} [stack] - Error stack trace.
 * @property {string} [url] - Page URL where the error occurred.
 * @property {string} [errorType] - JavaScript error type.
 * @property {string} [severity] - Error severity level.
 * @property {string} [release] - App release/version.
 * @property {string|Date} [timestamp] - Client-reported timestamp.
 */

/**
 * Collect error event data from a monitored application.
 * @route POST /api/collect/error
 * @param {import('express').Request} req - Express request containing a {@link CollectErrorPayload} in fields or body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} Sends JSON containing the saved error event.
 */
async function collectError(req, res) {
  try {
    const payload = req.fields || req.body;
    const { appId, message, stack, url, errorType, severity, release, timestamp } = payload;

    if (!appId || !message) {
      res.status(400).json({ error: 'appId and message are required' });
      return;
    }

    const event = await createEvent({
      appId,
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

export { collectError };
