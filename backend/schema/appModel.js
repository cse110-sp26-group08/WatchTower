/* eslint-env node */

import crypto from 'crypto';
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { db } from '../util/database.js';

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Columns returned by default (apiKey excluded, mirroring Mongoose select:false). */
const DEFAULT_APP_COLUMNS = {
  id: apps.id,
  ownerId: apps.ownerId,
  name: apps.name,
  createdAt: apps.createdAt,
  updatedAt: apps.updatedAt,
};

/**
 * Insert a new app row with an auto-generated apiKey.
 * Returns the full row including apiKey.
 * @param {{ ownerId: string, name: string }} data
 * @returns {Promise<object>}
 */
async function insertApp(data) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const [app] = await db.insert(apps).values({ ...data, apiKey }).returning();
  return app;
}

/**
 * Select an app by primary key. Does not include apiKey.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function selectAppById(id) {
  const [app] = await db.select(DEFAULT_APP_COLUMNS).from(apps).where(eq(apps.id, id));
  return app ?? null;
}

/**
 * Select an app by its apiKey. Includes the apiKey field.
 * @param {string} apiKey
 * @returns {Promise<object|null>}
 */
async function selectAppByApiKey(apiKey) {
  const [app] = await db.select().from(apps).where(eq(apps.apiKey, apiKey));
  return app ?? null;
}

/**
 * Select all apps belonging to an owner. Does not include apiKey.
 * @param {string} ownerId
 * @returns {Promise<object[]>}
 */
async function selectAppsByOwnerId(ownerId) {
  return db.select(DEFAULT_APP_COLUMNS).from(apps).where(eq(apps.ownerId, ownerId));
}

/**
 * Delete an app by primary key. Returns the deleted row.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function removeApp(id) {
  const [app] = await db.delete(apps).where(eq(apps.id, id)).returning();
  return app ?? null;
}

export { insertApp, selectAppById, selectAppByApiKey, selectAppsByOwnerId, removeApp };
