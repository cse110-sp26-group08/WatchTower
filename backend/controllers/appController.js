import { App } from '../schema/appModel.js';
import { isValidId } from '../util/idValidator.js';

/**
 * Create a new app document.
 * @param {{ownerId:string|import('mongoose').Types.ObjectId, name:string}} appData
 * @returns {Promise<import('mongoose').Document>}
 * @throws {Error} if ownerId is invalid or name is missing
 */
async function createApp({ ownerId, name }) {
  if (!isValidId(ownerId)) throw new Error('Invalid ownerId');
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('name is required and must be a non-empty string');
  }

  return App.create({ ownerId, name: name.trim() });
}


/**
 * Find an app by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getAppById(id) {
  if (!isValidId(id)) return null;
  return App.findById(id).exec();
}

/**
 * Find all apps belonging to a specific owner.
 * @param {string|import('mongoose').Types.ObjectId} ownerId
 * @returns {Promise<import('mongoose').Document[]>}
 */
async function getAllAppsByOwnerId(ownerId) {
  if (!isValidId(ownerId)) return [];
  return App.find({ ownerId }).exec();
}

/**
 * Delete an app by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deleteAppById(id) {
  if (!isValidId(id)) return null;
  return App.findByIdAndDelete(id).exec();
}

export { createApp, getAppById, getAllAppsByOwnerId, deleteAppById };