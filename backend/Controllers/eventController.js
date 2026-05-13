import { Event } from '../schema/schemas.js';

/**
 * Create a new event document.
 * @param {{appId:string|import('mongoose').Types.ObjectId,type:string,timestamp?:Date,url?:string,metadata?:Object,receivedAt?:Date}} eventData
 * @returns {Promise<import('mongoose').Document>}
 */
async function createEvent(eventData) {
  return Event.create(eventData);
}

/**
 * Find an event by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getEventById(id) {
  return Event.findById(id).exec();
}

/**
 * Find all events for a specific app.
 * @param {string|import('mongoose').Types.ObjectId} appId
 * @returns {Promise<import('mongoose').Document[]>}
 */
async function getAllEventsByAppId(appId) {
  return Event.find({ appId }).exec();
}

/**
 * Delete an event by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deleteEventById(id) {
  return Event.findByIdAndDelete(id).exec();
}

export { createEvent, getEventById, getAllEventsByAppId, deleteEventById };