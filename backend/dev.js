/* eslint-env node */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { initDb } from './util/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

initDb();

const app = createApp();

// Serve frontend static assets (local dev only — CF Pages handles this in production)
app.use('/styling/*', serveStatic({ root: '../frontend' }));
app.use('/js/*', serveStatic({ root: '../frontend' }));
app.use('/templates/*', serveStatic({ root: '../frontend' }));
app.use('/assets/*', serveStatic({ root: '../frontend' }));

const pages = path.join(__dirname, '../frontend/webpages');

function htmlFile(filename) {
  return (c) => {
    try {
      const html = readFileSync(path.join(pages, filename), 'utf-8');
      return c.html(html);
    } catch {
      return c.text('Not found', 404);
    }
  };
}

app.get('/', htmlFile('index.html'));
app.get('/login', htmlFile('login.html'));
app.get('/signup', htmlFile('signup.html'));
app.get('/apps', htmlFile('app_selection.html'));
app.get('/dashboard', htmlFile('dashboard.html'));
app.get('/advanced-performance-metrics', htmlFile('advanced_performance_metrics.html'));
app.get('/advanced-error-metrics', htmlFile('advanced_error_metrics.html'));
app.get('/settings', htmlFile('settings.html'));
app.get('/docs', htmlFile('docs.html'));
app.get('/privacy', htmlFile('privacy.html'));
app.get('/terms', htmlFile('terms.html'));

const port = process.env.PORT || 3000;
serve({ fetch: app.fetch, port }, () => {
  // eslint-disable-next-line no-console
  console.log(`WatchTower dev server on http://localhost:${port}`);
});
