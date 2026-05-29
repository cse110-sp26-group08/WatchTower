/* eslint-env node */

import {
  insertApp,
  selectAppById,
  selectAppByApiKey,
  selectAppByIdWithApiKey,
  selectAppsByOwnerId,
  removeApp,
  updateApp,
} from '../schema/appModel.js';
import { isValidId } from '../util/idValidator.js';
import { withToObject, withToObjectArray } from '../util/toObject.js';

/**
 * Create a new app.
 * @param {{ownerId:string, name:string, url?:string}} appData
 * @returns {Promise<object>}
 * @throws {Error} if ownerId is invalid or name is missing
 */
async function createApp({ ownerId, name, url }) {
  if (!isValidId(ownerId)) throw new Error('Invalid ownerId');
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('name is required and must be a non-empty string');
  }

  const data = { ownerId, name: name.trim() };
  if (url && typeof url === 'string' && url.trim()) data.url = url.trim();

  return withToObject(await insertApp(data));
}

/**
 * Find an app by its UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getAppById(id) {
  if (!isValidId(id)) return null;
  return withToObject(await selectAppById(id));
}

/**
 * Find an app by its API key.
 * @param {string} apiKey
 * @returns {Promise<object|null>}
 */
async function getAppByApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
  return withToObject(await selectAppByApiKey(apiKey.trim()));
}

/**
 * Find all apps belonging to a specific owner.
 * @param {string} ownerId
 * @returns {Promise<object[]>}
 */
async function getAllAppsByOwnerId(ownerId) {
  if (!isValidId(ownerId)) return [];
  return withToObjectArray(await selectAppsByOwnerId(ownerId));
}

/**
 * Delete an app by its UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function deleteAppById(id) {
  if (!isValidId(id)) return null;
  return withToObject(await removeApp(id));
}

/**
 * Find an app by its UUID, including the apiKey field.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getAppByIdWithApiKey(id) {
  if (!isValidId(id)) return null;
  return withToObject(await selectAppByIdWithApiKey(id));
}

/**
 * Update the name and/or url of an app.
 * @param {string} id
 * @param {{ name?: string, url?: string }} fields
 * @returns {Promise<object|null>}
 * @throws {Error} if name is provided but empty
 */
async function updateAppById(id, { name, url }) {
  if (!isValidId(id)) return null;

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('name must be a non-empty string');
    }
    updates.name = name.trim();
  }

  if (url !== undefined) {
    updates.url = url && typeof url === 'string' && url.trim() ? url.trim() : null;
  }

  return withToObject(await updateApp(id, updates));
}

export { createApp, getAppByApiKey, getAppById, getAppByIdWithApiKey, getAllAppsByOwnerId, deleteAppById, updateAppById };
