import { Event } from '../schema/eventModel.js';
import { isValidId } from '../util/idValidator.js';
 
const VALID_EVENT_TYPES = ['error', 'performance', 'feedback', 'release'];
 
/**
 * Create a new event document.
 * Only whitelisted fields are passed to the DB — metadata is accepted as-is
 * since it is intentionally flexible (Mixed type).
 * @param {{appId:string|import('mongoose').Types.ObjectId, type:string, timestamp?:Date, url?:string, metadata?:Object}} eventData
 * @returns {Promise<import('mongoose').Document>}
 * @throws {Error} if appId is invalid or type is not a recognised event type
 */
async function createEvent({ appId, type, timestamp, url, metadata }) {
  if (!isValidId(appId)) throw new Error('Invalid appId');
  if (!type || !VALID_EVENT_TYPES.includes(type)) {
    throw new Error(`type must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }
 
  return Event.create({
    appId,
    type,
    timestamp: timestamp instanceof Date ? timestamp : new Date(),
    url:       typeof url === 'string' ? url.trim() : undefined,
    metadata:  metadata && typeof metadata === 'object' ? metadata : {},
    receivedAt: new Date(),
  });
}

/**
 * Find an event by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getEventById(id) {
  if (!isValidId(id)) return null;
  return Event.findById(id).exec();
}

/**
 * Find all events for a specific app.
 * @param {string|import('mongoose').Types.ObjectId} appId
 * @returns {Promise<import('mongoose').Document[]>}
 */
async function getAllEventsByAppId(appId) {
  if (!isValidId(appId)) return [];
  return Event.find({ appId }).exec();
}

/**
 * Delete an event by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deleteEventById(id) {
  if (!isValidId(id)) return null;
  return Event.findByIdAndDelete(id).exec();
}

export { createEvent, getEventById, getAllEventsByAppId, deleteEventById };