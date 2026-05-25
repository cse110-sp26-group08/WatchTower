/* eslint-env node */

import bcrypt from 'bcrypt';
import {
  insertUser,
  selectUserById,
  selectUserByEmail,
  updateUser,
  removeUser,
} from '../schema/userModel.js';
import { isValidId } from '../util/idValidator.js';
import { withToObject } from '../util/toObject.js';

const ALLOWED_UPDATE_FIELDS = ['username', 'email'];
const SALT_ROUNDS = 10;

function toSafeUser(user) {
  if (!user) return null;
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.passwordHash;
  return safeUser;
}

/**
 * Create a new user.
 * @param {{username:string, email:string, password:string}} userData
 * @returns {Promise<object>}
 * @throws {Error} if any required field is missing or invalid
 */
async function createUser({ username, email, password }) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    throw new Error('username is required and must be a non-empty string');
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('email is required and must be a non-empty string');
  }
  if (!password || typeof password !== 'string') {
    throw new Error('password is required and must be a string');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await insertUser({ username: username.trim(), email: email.trim(), passwordHash });
  return withToObject(user);
}

/**
 * Find a user by its UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getUserById(id) {
  if (!isValidId(id)) return null;
  return withToObject(await selectUserById(id));
}

/**
 * Check whether login credentials match a saved user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object|null>} safe user object (no passwordHash) when login succeeds
 */
async function checkLoginCredentials(email, password) {
  if (!email || typeof email !== 'string' || !email.trim()) return null;
  if (!password || typeof password !== 'string') return null;

  const user = await selectUserByEmail(email.trim().toLowerCase());
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  return toSafeUser(user);
}

/**
 * Update a user by its UUID. Only whitelisted fields (username, email) are applied.
 * Returns updated user without passwordHash.
 * @param {string} id
 * @param {Partial<{username:string, email:string}>} updateData
 * @returns {Promise<object|null>}
 */
async function editUser(id, updateData) {
  if (!isValidId(id)) return null;
  if (!updateData || typeof updateData !== 'object') return null;

  const safeUpdate = Object.fromEntries(
    Object.entries(updateData).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key))
  );

  if (Object.keys(safeUpdate).length === 0) return null;

  return withToObject(await updateUser(id, safeUpdate));
}

/**
 * Delete a user by its UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function deleteUserById(id) {
  if (!isValidId(id)) return null;
  return withToObject(await removeUser(id));
}

export {
  createUser,
  getUserById,
  checkLoginCredentials,
  editUser,
  deleteUserById,
};
