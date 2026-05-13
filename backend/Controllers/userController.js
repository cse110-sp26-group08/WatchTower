import bcrypt from 'bcrypt';
import { User } from '../schema/userModel.js';
import { isValidId } from '../util/idValidator.js';
 
const ALLOWED_UPDATE_FIELDS = ['username', 'email', 'passwordHash'];

/**
 * Create a new user document.
 * @param {{username:string, email:string, passwordHash:string}} userData
 * @returns {Promise<import('mongoose').Document>}
 * @throws {Error} if any required field is missing or invalid
 */
async function createUser({ username, email, passwordHash }) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    throw new Error('username is required and must be a non-empty string');
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('email is required and must be a non-empty string');
  }
  if (!passwordHash || typeof passwordHash !== 'string') {
    throw new Error('passwordHash is required and must be a string');
  }
 
  return User.create({ username: username.trim(), email: email.trim(), passwordHash });
}

/**
 * Find a user by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getUserById(id) {
  if (!isValidId(id)) return null;
  return User.findById(id).exec();
}

/**
 * Check whether a plain-text password matches a user's stored bcrypt hash.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {string} password - plain-text password to verify
 * @returns {Promise<boolean>}
 */
async function checkUserPassword(id, password) {
  if (!isValidId(id)) return false;
  if (!password || typeof password !== 'string') return false;
 
  const user = await User.findById(id).exec();
  if (!user) return false;
 
  return bcrypt.compare(password, user.passwordHash);
}
 
/**
 * Update a user document by its ObjectId.
 * Only whitelisted fields (username, email, passwordHash) are applied.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {Partial<{username:string, email:string, passwordHash:string}>} updateData
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function editUser(id, updateData) {
  if (!isValidId(id)) return null;
  if (!updateData || typeof updateData !== 'object') return null;
 
  // Strip any fields not in the allowed list so callers can't patch arbitrary fields
  const safeUpdate = Object.fromEntries(
    Object.entries(updateData).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key))
  );
 
  if (Object.keys(safeUpdate).length === 0) return null;
 
  return User.findByIdAndUpdate(id, safeUpdate, {
    new: true,
    runValidators: true,
  }).select('-passwordHash').exec();
}

/**
 * Delete a user by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deleteUserById(id) {
  if (!isValidId(id)) return null;
  return User.findByIdAndDelete(id).exec();
}

export { createUser, getUserById, checkUserPassword, editUser, deleteUserById };