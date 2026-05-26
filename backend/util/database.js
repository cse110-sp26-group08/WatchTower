/* eslint-env node */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

/**
 * Live-binding reference to the Drizzle db instance.
 * Starts undefined — call initDb() before making any queries.
 * @type {import('drizzle-orm/neon-http').NeonHttpDatabase | undefined}
 */
export let db;

/**
 * Initialize the Drizzle client with a Neon HTTP connection.
 * Must be called after dotenv is loaded (so DATABASE_URL is available).
 * @param {string} [url]
 */
export function initDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is required');
  db = drizzle(neon(url));
}
