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
import { checkLoginCredentials, createUser, findOrCreateOAuthUser } from './controllers/userController.js';
import { initDb } from './util/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function redirectToGoogleOAuth(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    res.status(501).json({ message: 'Google sign in is not configured.' });
    return;
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function requestGoogleTokens(code, redirectUri) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with status ${response.status}`);
  }

  return response.json();
}

async function requestGoogleProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google profile request failed with status ${response.status}`);
  }

  return response.json();
}

async function handleGoogleOAuthCallback(req, res) {
  const { code, error } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (error) {
    res.status(400).json({ message: `Google sign in was cancelled or denied: ${error}` });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ message: 'Google authorization code is missing.' });
    return;
  }

  if (!clientId || !clientSecret) {
    res.status(501).json({ message: 'Google sign in is not configured.' });
    return;
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/auth/google/callback`;
    const tokenData = await requestGoogleTokens(code, redirectUri);

    if (!tokenData.access_token) {
      res.status(502).json({ message: 'Google did not return an access token.' });
      return;
    }

    const profile = await requestGoogleProfile(tokenData.access_token);

    if (!profile.email || profile.email_verified === false || profile.email_verified === 'false') {
      res.status(401).json({ message: 'Google account email must be verified.' });
      return;
    }

    const user = await findOrCreateOAuthUser({
      username: profile.name,
      email: profile.email,
    });

    req.session.user = user;
    res.redirect('/apps');
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : 'Unknown Google sign in error';
    res.status(502).json({ message: `Could not complete Google sign in: ${message}` });
  }
}

function redirectToGitHubOAuth(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    res.status(501).json({ message: 'GitHub sign in is not configured.' });
    return;
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${getBaseUrl(req)}/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

async function requestGitHubTokens(code, redirectUri) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token request failed with status ${response.status}`);
  }

  const tokenData = await response.json();
  if (tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error);
  }

  return tokenData;
}

async function requestGitHubProfile(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'WatchTower',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub profile request failed with status ${response.status}`);
  }

  return response.json();
}

async function requestGitHubEmails(accessToken) {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'WatchTower',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub email request failed with status ${response.status}`);
  }

  return response.json();
}

function getVerifiedGitHubEmail(emails) {
  const verifiedPrimaryEmail = emails.find((email) => email.primary && email.verified && email.email);
  if (verifiedPrimaryEmail) {
    return verifiedPrimaryEmail.email;
  }

  return emails.find((email) => email.verified && email.email)?.email;
}

async function handleGitHubOAuthCallback(req, res) {
  const { code, error } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (error) {
    res.status(400).json({ message: `GitHub sign in was cancelled or denied: ${error}` });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ message: 'GitHub authorization code is missing.' });
    return;
  }

  if (!clientId || !clientSecret) {
    res.status(501).json({ message: 'GitHub sign in is not configured.' });
    return;
  }

  try {
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${getBaseUrl(req)}/auth/github/callback`;
    const tokenData = await requestGitHubTokens(code, redirectUri);

    if (!tokenData.access_token) {
      res.status(502).json({ message: 'GitHub did not return an access token.' });
      return;
    }

    const [profile, emails] = await Promise.all([
      requestGitHubProfile(tokenData.access_token),
      requestGitHubEmails(tokenData.access_token),
    ]);
    const email = getVerifiedGitHubEmail(emails);

    if (!email) {
      res.status(401).json({ message: 'GitHub account must have a verified email.' });
      return;
    }

    const user = await findOrCreateOAuthUser({
      username: profile.name || profile.login,
      email,
    });

    req.session.user = user;
    res.redirect('/apps');
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : 'Unknown GitHub sign in error';
    res.status(502).json({ message: `Could not complete GitHub sign in: ${message}` });
  }
}

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
  app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

  // Serve Pages
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/index.html'));
  });

  app.get('/login', (req, res) => {
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

  app.get('/auth/google', redirectToGoogleOAuth);

  app.get('/auth/google/callback', handleGoogleOAuthCallback);

  app.get('/auth/github', redirectToGitHubOAuth);

  app.get('/auth/github/callback', handleGitHubOAuthCallback);

  app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/docs.html'));
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

  app.get('/apps', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/app_selection.html'));
  });

  app.get('/dashboard', (req, res) => {
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
