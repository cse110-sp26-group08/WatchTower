/* eslint-env node */

import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { db } from '../util/database.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Insert a new user row.
 * @param {{ username: string, email: string, passwordHash: string }} data
 * @returns {Promise<object>}
 */
async function insertUser(data) {
  const [user] = await db.insert(users).values({
    username: data.username.trim(),
    email: data.email.trim().toLowerCase(),
    passwordHash: data.passwordHash,
  }).returning();
  return user;
}

/**
 * Select a user by primary key.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function selectUserById(id) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

/**
 * Select a user by email address.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function selectUserByEmail(email) {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  return user ?? null;
}

/**
 * Update allowed fields on a user row. Returns the updated row without passwordHash.
 * @param {string} id
 * @param {Partial<{ username: string, email: string }>} data
 * @returns {Promise<object|null>}
 */
async function updateUser(id, data) {
  const [user] = await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  return user ?? null;
}

/**
 * Delete a user row by primary key. Returns the deleted row.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function removeUser(id) {
  const [user] = await db.delete(users).where(eq(users.id, id)).returning();
  return user ?? null;
}

export { insertUser, selectUserById, selectUserByEmail, updateUser, removeUser };
