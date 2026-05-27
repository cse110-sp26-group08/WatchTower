/* eslint-env node */

import {
  insertEvent,
  selectEventById,
  selectEventsByAppId,
  removeEvent,
} from '../schema/eventModel.js';
import { isValidId } from '../util/idValidator.js';
import { withToObject, withToObjectArray } from '../util/toObject.js';

const VALID_EVENT_TYPES = ['error', 'performance', 'feedback', 'release'];

/**
 * Create a new event.
 * @param {{appId:string, type:string, timestamp?:Date, url?:string, metadata?:object}} eventData
 * @returns {Promise<object>}
 * @throws {Error} if appId is invalid or type is unrecognised
 */
async function createEvent({ appId, type, timestamp, url, metadata }) {
  if (!isValidId(appId)) throw new Error('Invalid appId');
  if (!type || !VALID_EVENT_TYPES.includes(type)) {
    throw new Error(`type must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  return withToObject(await insertEvent({
    appId,
    type,
    timestamp: timestamp instanceof Date ? timestamp : new Date(),
    url:       typeof url === 'string' ? url.trim() : null,
    metadata:  metadata && typeof metadata === 'object' ? metadata : {},
    receivedAt: new Date(),
  }));
}

/**
 * Find an event by its UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getEventById(id) {
  if (!isValidId(id)) return null;
  return withToObject(await selectEventById(id));
}

/**
 * Find all events for a specific app.
 * @param {string} appId
 * @returns {Promise<object[]>}
 */
async function getAllEventsByAppId(appId) {
  if (!isValidId(appId)) return [];
  return withToObjectArray(await selectEventsByAppId(appId));
}

/**
 * Delete an event by its UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function deleteEventById(id) {
  if (!isValidId(id)) return null;
  return withToObject(await removeEvent(id));
}

export { createEvent, getEventById, getAllEventsByAppId, deleteEventById };
