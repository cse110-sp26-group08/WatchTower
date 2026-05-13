/* eslint-env node */

import { createEvent } from '../controllers/eventController.js';

/**
 * @typedef {object} CollectPerformancePayload
 * @property {string} appId - Application ID associated with the event.
 * @property {number} [loadTimeMs] - Full page load time in milliseconds.
 * @property {number} [domContentLoadedMs] - DOMContentLoaded timing in milliseconds.
 * @property {number} [ttfbMs] - Time to first byte in milliseconds.
 * @property {string} [apiEndpoint] - API endpoint measured, if applicable.
 * @property {number} [apiLatencyMs] - API response time in milliseconds.
 * @property {number} [memoryMB] - JS heap memory usage in MB.
 * @property {string} [url] - Page URL where the metric was captured.
 * @property {string} [release] - App release/version.
 * @property {string|Date} [timestamp] - Client-reported timestamp.
 */

/**
 * Collect performance metric data from a monitored application.
 * @route POST /api/collect/performance
 * @param {import('express').Request} req - Express request containing a {@link CollectPerformancePayload} in fields or body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} Sends JSON containing the saved performance event.
 */
async function collectPerformance(req, res) {
  try {
    const payload = req.fields || req.body;
    const {
      appId,
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

    if (!appId) {
      res.status(400).json({ error: 'appId is required' });
      return;
    }

    const event = await createEvent({
      appId,
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

export { collectPerformance };
