/* eslint-env jest, node */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, db } from '../util/database.js';
import { events } from '../schema/eventModel.js';
import { apps } from '../schema/appModel.js';
import { users } from '../schema/userModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test env vars before initDb() is called.
// Create a .env.test file with DATABASE_URL pointing to your test database.
dotenv.config({ path: path.join(__dirname, '../.env.test') });

beforeAll(() => {
  initDb();
});

afterEach(async () => {
  // Truncate in FK-safe order: events → apps → users
  await db.delete(events);
  await db.delete(apps);
  await db.delete(users);
});
