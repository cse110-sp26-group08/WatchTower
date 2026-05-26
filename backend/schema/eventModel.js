/* eslint-env node */

import { pgTable, pgEnum, text, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { db } from '../util/database.js';

export const eventTypeEnum = pgEnum('event_type', ['error', 'performance', 'feedback', 'release']);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').notNull(),
  type: eventTypeEnum('type').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  url: text('url'),
  metadata: jsonb('metadata').default({}),
  receivedAt: timestamp('received_at').notNull(),
});

/**
 * Insert a new event row.
 * @param {{ appId: string, type: string, timestamp: Date, url?: string, metadata?: object, receivedAt: Date }} data
 * @returns {Promise<object>}
 */
async function insertEvent(data) {
  const [event] = await db.insert(events).values(data).returning();
  return event;
}

/**
 * Select an event by primary key.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function selectEventById(id) {
  const [event] = await db.select().from(events).where(eq(events.id, id));
  return event ?? null;
}

/**
 * Select all events belonging to an app.
 * @param {string} appId
 * @returns {Promise<object[]>}
 */
async function selectEventsByAppId(appId) {
  return db.select().from(events).where(eq(events.appId, appId));
}

/**
 * Delete an event by primary key. Returns the deleted row.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function removeEvent(id) {
  const [event] = await db.delete(events).where(eq(events.id, id)).returning();
  return event ?? null;
}

export { insertEvent, selectEventById, selectEventsByAppId, removeEvent };
