/* eslint-env node */

/**
 * @fileoverview Express server for WatchTower backend.
 * @module backend/app
 */

import express from 'express';
import formidable from 'express-formidable';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createErrorEndpoint,
  deleteErrorEndpoint,
  getErrorEndpoint,
  getErrorsByAppEndpoint,
} from './endpoints/error.js';
import {
  createPerformanceEndpoint,
  deletePerformanceEndpoint,
  getPerformanceByAppEndpoint,
  getPerformanceEndpoint,
} from './endpoints/performance.js';
import {
  createAppEndpoint,
  deleteAppEndpoint,
  getAppEndpoint,
  getAppsByOwnerEndpoint,
} from './endpoints/apps.js';
import {
  createUserEndpoint,
  deleteUserEndpoint,
  getUserEndpoint,
  updateUserEndpoint,
} from './endpoints/users.js';
import { connectDatabase } from './util/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * Create an Express application.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();

  app.use(formidable());

  // Serve static assets for the frontend
  app.use('/styling', express.static(path.join(__dirname, '../frontend/styling')));
  app.use('/js', express.static(path.join(__dirname, '../frontend/js')));

  // Serve Pages
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/homepage.html'));
  });

  // API ENDPOINTS
  // Error Endpoints
  app.post('/api/events/error', createErrorEndpoint);
  app.get('/api/events/error/apps/:appId', getErrorsByAppEndpoint);
  app.get('/api/events/error/:id', getErrorEndpoint);
  app.delete('/api/events/error/:id', deleteErrorEndpoint);

  // Performance Endpoints
  app.post('/api/events/performance', createPerformanceEndpoint);
  app.get('/api/events/performance/apps/:appId', getPerformanceByAppEndpoint);
  app.get('/api/events/performance/:id', getPerformanceEndpoint);
  app.delete('/api/events/performance/:id', deletePerformanceEndpoint);

  // User Endpoints
  app.post('/api/users', createUserEndpoint);
  app.get('/api/users/:id', getUserEndpoint);
  app.patch('/api/users/:id', updateUserEndpoint);
  app.delete('/api/users/:id', deleteUserEndpoint);

  // App Endpoints
  app.post('/api/apps', createAppEndpoint);
  app.get('/api/apps/:id', getAppEndpoint);
  app.delete('/api/apps/:id', deleteAppEndpoint);
  app.get('/api/apps/users/:ownerId', getAppsByOwnerEndpoint);

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
