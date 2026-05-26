/* eslint-env node */

/**
 * @fileoverview Express server for WatchTower backend.
 * @module backend/app
 */

import express from 'express';
import formidable from 'express-formidable';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
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
  forceStatusEndpoint,
  getAppEndpoint,
  getAppsByOwnerEndpoint,
} from './endpoints/apps.js';
import {
  createUserEndpoint,
  deleteUserEndpoint,
  getUserEndpoint,
  updateUserEndpoint,
} from './endpoints/users.js';
import { checkLoginCredentials, createUser } from './controllers/userController.js';
import { initDb } from './util/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const telemetryCors = cors({
  origin: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
});

/**
 * Create an Express application.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();
  const formidableMiddleware = formidable();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    if (req.is('application/json') || req.is('application/x-www-form-urlencoded')) {
      next();
      return;
    }

    formidableMiddleware(req, res, next);
  });
  app.use(session({
    secret: process.env.SESSION_SECRET || 'watchtower-development-secret',
    resave: false,
    saveUninitialized: false,
  }));

  // Serve static assets for the frontend
  app.use('/styling', express.static(path.join(__dirname, '../frontend/styling')));
  app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
  app.use('/sw.js', express.static(path.join(__dirname, '../frontend/sw.js')));

  // Serve Pages
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/index.html'));
  });

  app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/login.html'));
  });

  app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/login.html'));
  });

  app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.fields || req.body;
      const user = await checkLoginCredentials(email, password);

      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      req.session.user = user;
      res.status(200).json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message });
    }
  });

  app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/signup.html'));
  });

  app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/signup.html'));
  });

  app.post('/signup', async (req, res) => {
    try {
      const { username, email, password, confirmPassword } = req.fields || req.body;

      if (password !== confirmPassword) {
        res.status(400).json({ message: 'Passwords do not match' });
        return;
      }

      const user = await createUser({ username, email, password });
      const safeUser = user.toObject();
      delete safeUser.passwordHash;

      req.session.user = safeUser;
      res.status(201).json({ user: safeUser });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(400).json({ message });
    }
  });

  app.get('/app-selection', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/app_selection.html'));
  });

  app.get('/app_selection.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/app_selection.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/dashboard.html'));
  });

  app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/dashboard.html'));
  });

  // API ENDPOINTS
  // Error Endpoints
  app.options('/api/events/error', telemetryCors);
  app.post('/api/events/error', telemetryCors, createErrorEndpoint);
  app.get('/api/events/error/apps/:appId', getErrorsByAppEndpoint);
  app.get('/api/events/error/:id', getErrorEndpoint);
  app.delete('/api/events/error/:id', deleteErrorEndpoint);

  // Performance Endpoints
  app.options('/api/events/performance', telemetryCors);
  app.post('/api/events/performance', telemetryCors, createPerformanceEndpoint);
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
  app.post('/api/apps/:id/forceStatus', forceStatusEndpoint);
  app.get('/api/apps/:id', getAppEndpoint);
  app.delete('/api/apps/:id', deleteAppEndpoint);
  app.get('/api/apps/users/:ownerId', getAppsByOwnerEndpoint);

  return app;
}

const app = createApp();
const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  initDb();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`WatchTower backend listening on http://localhost:${port}`);
  });
}

export { createApp };
