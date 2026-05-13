/**
 * @fileoverview Express server for WatchTower backend.
 * @module backend/app
 */

import express from 'express';
import formidable from 'express-formidable';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEvent } from './Controllers/eventController.js';

/**
 * Create an Express application.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();

  app.use(formidable());
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use('/styling', express.static(path.join(__dirname, '../frontend/styling')));
  app.use('/js', express.static(path.join(__dirname, '../frontend/js')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/homepage.html'));
  });

  /**
   * Collect error event data from a monitored application.
   * @route POST /api/collect/error
   * @param {string} appId - Application ID associated with the event.
   * @param {string} message - Error message.
   * @param {string} [stack] - Error stack trace.
   * @param {string} [url] - Page URL where the error occurred.
   * @param {string} [errorType] - JavaScript error type.
   * @param {string} [severity] - Error severity level.
   * @param {string} [release] - App release/version.
   * @param {string|Date} [timestamp] - Client-reported timestamp.
   * @returns {Promise<void>} JSON response containing the saved error event.
   */
  app.post('/api/collect/error', async (req, res) => {
    try {
      const payload = req.fields || req.body;
      const { appId, message, stack, url, errorType, severity, release, timestamp } = payload;

      if (!appId || !message) {
        return res.status(400).json({ error: 'appId and message are required' });
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

      return res.status(201).json({ event });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  /**
   * Collect performance metric data from a monitored application.
   * @route POST /api/collect/performance
   * @param {string} appId - Application ID associated with the event.
   * @param {number} [loadTimeMs] - Full page load time in milliseconds.
   * @param {number} [domContentLoadedMs] - DOMContentLoaded timing in milliseconds.
   * @param {number} [ttfbMs] - Time to first byte in milliseconds.
   * @param {string} [apiEndpoint] - API endpoint measured, if applicable.
   * @param {number} [apiLatencyMs] - API response time in milliseconds.
   * @param {number} [memoryMB] - JS heap memory usage in MB.
   * @param {string} [url] - Page URL where the metric was captured.
   * @param {string} [release] - App release/version.
   * @param {string|Date} [timestamp] - Client-reported timestamp.
   * @returns {Promise<void>} JSON response containing the saved performance event.
   */
  app.post('/api/collect/performance', async (req, res) => {
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
        return res.status(400).json({ error: 'appId is required' });
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

      return res.status(201).json({ event });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  return app;
}

const app = createApp();
const port = 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`WatchTower backend listening on http://localhost:${port}`);
  });
}

export { createApp };
