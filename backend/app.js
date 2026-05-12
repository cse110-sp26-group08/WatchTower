/**
 * @fileoverview Express server for WatchTower backend.
 * @module backend/app
 */

import express from 'express';
import formidable from 'express-formidable';
import path from 'path';

/**
 * Create an Express application.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();

  app.use(formidable());
  __dirname = import.meta.dirname;
  app.use('/styling', express.static(path.join(__dirname, '../frontend/styling')));
  app.use('/js', express.static(path.join(__dirname, '../frontend/js')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/webpages/homepage.html'));
  });

  return app;
}

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`WatchTower backend listening on http://localhost:${port}`);
});
