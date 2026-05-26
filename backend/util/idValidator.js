import mongoose from 'mongoose';
const { isValid, createFromHexString } = mongoose.Types.ObjectId;

/**
 * Validate that a value is a valid MongoDB ObjectId.
 * @param {string | import('mongoose').Types.ObjectId} id
 * @returns {boolean}
 */
function isValidId(id) {
  return isValid(id) && createFromHexString(id.toString()).toString() === id.toString();
}

export { isValidId };