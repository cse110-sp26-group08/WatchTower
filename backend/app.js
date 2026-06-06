/* eslint-env node */

import { Hono } from 'hono';
import { signJwt, COOKIE_NAME } from './util/auth.js';
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
  getAppApiKeyEndpoint,
  getAppEndpoint,
  getAppsByOwnerEndpoint,
  updateAppEndpoint,
} from './endpoints/apps.js';
import {
  createUserEndpoint,
  deleteUserEndpoint,
  getUserEndpoint,
  updateUserEndpoint,
} from './endpoints/users.js';
import { checkLoginCredentials, createUser } from './controllers/userController.js';

/**
 * Create and return the Hono application.
 * Does not start a server — use worker.js (CF Workers) or dev.js (Node.js local).
 * @returns {import('hono').Hono}
 */
function createApp() {
  const app = new Hono();

  // CORS for telemetry endpoints — open to any origin since collector.js runs on user apps
  app.use('/api/events/*', async (c, next) => {
    const origin = c.req.header('Origin');
    c.header('Access-Control-Allow-Origin', origin || '*');
    c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type');
    if (origin) c.header('Access-Control-Allow-Credentials', 'true');
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    await next();
  });

  // ── Auth routes ─────────────────────────────────────────────────────────────

  app.post('/login', async (c) => {
    try {
      const { email, password } = await c.req.json();
      const user = await checkLoginCredentials(email, password);
      if (!user) return c.json({ message: 'Invalid email or password' }, 401);

      const secret = c.env?.JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret';
      const token = await signJwt({ userId: user.id, email: user.email, username: user.username }, secret);
      const secure = (c.env?.NODE_ENV ?? process.env.NODE_ENV) === 'production' ? '; Secure' : '';
      c.header('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}${secure}`);
      return c.json({ user }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return c.json({ message }, 500);
    }
  });

  app.post('/signup', async (c) => {
    try {
      const { username, email, password, confirmPassword } = await c.req.json();

      if (password !== confirmPassword) {
        return c.json({ message: 'Passwords do not match' }, 400);
      }

      const user = await createUser({ username, email, password });
      const safeUser = user.toObject();
      delete safeUser.passwordHash;

      const secret = c.env?.JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret';
      const token = await signJwt({ userId: safeUser.id, email: safeUser.email, username: safeUser.username }, secret);
      const secure = (c.env?.NODE_ENV ?? process.env.NODE_ENV) === 'production' ? '; Secure' : '';
      c.header('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}${secure}`);
      return c.json({ user: safeUser }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return c.json({ message }, 400);
    }
  });

  app.post('/logout', (c) => {
    c.header('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
    return c.json({ message: 'Logged out' }, 200);
  });

  // ── Error event endpoints ────────────────────────────────────────────────────

  app.post('/api/events/error', createErrorEndpoint);
  app.get('/api/events/error/apps/:appId', getErrorsByAppEndpoint);
  app.get('/api/events/error/:id', getErrorEndpoint);
  app.delete('/api/events/error/:id', deleteErrorEndpoint);

  // ── Performance event endpoints ──────────────────────────────────────────────

  app.post('/api/events/performance', createPerformanceEndpoint);
  app.get('/api/events/performance/apps/:appId', getPerformanceByAppEndpoint);
  app.get('/api/events/performance/:id', getPerformanceEndpoint);
  app.delete('/api/events/performance/:id', deletePerformanceEndpoint);

  // ── User endpoints ───────────────────────────────────────────────────────────

  app.post('/api/users', createUserEndpoint);
  app.get('/api/users/:id', getUserEndpoint);
  app.patch('/api/users/:id', updateUserEndpoint);
  app.delete('/api/users/:id', deleteUserEndpoint);

  // ── App endpoints ────────────────────────────────────────────────────────────

  app.post('/api/apps', createAppEndpoint);
  app.post('/api/apps/:id/forceStatus', forceStatusEndpoint);
  app.get('/api/apps/:id/apikey', getAppApiKeyEndpoint);
  app.get('/api/apps/users/:ownerId', getAppsByOwnerEndpoint);
  app.get('/api/apps/:id', getAppEndpoint);
  app.patch('/api/apps/:id', updateAppEndpoint);
  app.delete('/api/apps/:id', deleteAppEndpoint);

  // Catch-all: serve remaining static assets from Workers Assets (production)
  // or fall through to dev.js static middleware (local dev)
  app.all('*', async (c, next) => {
    if (c.env?.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
    return next();
  });

  return app;
}

export { createApp };
