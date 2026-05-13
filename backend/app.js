/* eslint-env node */

/**
 * @fileoverview Express server for WatchTower backend.
 * @module backend/app
 */

import express from 'express';
import formidable from 'express-formidable';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectError } from './endpoints/collectError.js';
import { collectPerformance } from './endpoints/collectPerformance.js';
import { connectDatabase } from './util/database.js';

/**
 * Create an Express application.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();

  app.use(formidable());
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Serve static assets for the frontend
  app.use('/styling', express.static(path.join(__dirname, '../frontend/styling')));
  app.use('/js', express.static(path.join(__dirname, '../frontend/js')));

  // Serve Pages
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/homepage.html'));
  });

  // API Endpoints
  app.post('/api/collect/error', collectError);
  app.post('/api/collect/performance', collectPerformance);

  return app;
}

const app = createApp();
const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  connectDatabase()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Connected to MongoDB');

      app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`WatchTower backend listening on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to connect to MongoDB:', error.message);
      process.exit(1);
    });
}

export { createApp };
