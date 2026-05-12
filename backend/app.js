/**
 * @fileoverview Express server for WatchTower backend.
 * @module backend/app
 */

const express = require('express');
const formidable = require('express-formidable');
const path = require('path');

/**
 * Create an Express application.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();

  app.use(formidable());

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
