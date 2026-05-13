import { App } from '../schema/schemas.js';

/**
 * Create a new app document.
 * @param {{ownerId:string|import('mongoose').Types.ObjectId,name:string,apiKey?:string}} appData
 * @returns {Promise<import('mongoose').Document>}
 */
async function createApp(appData) {
  return App.create(appData);
}

/**
 * Find an app by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getAppById(id) {
  return App.findById(id).exec();
}

/**
 * Find all apps belonging to a specific owner.
 * @param {string|import('mongoose').Types.ObjectId} ownerId
 * @returns {Promise<import('mongoose').Document[]>}
 */
async function getAllAppsByOwnerId(ownerId) {
  return App.find({ ownerId }).exec();
}

/**
 * Delete an app by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deleteAppById(id) {
  return App.findByIdAndDelete(id).exec();
}

export { createApp, getAppById, getAllAppsByOwnerId, deleteAppById };