import { User } from '../schema/schemas.js';

/**
 * Create a new user document.
 * @param {{username:string,email:string,passwordHash:string}} userData
 * @returns {Promise<import('mongoose').Document>}
 */
async function createUser(userData) {
  return User.create(userData);
}

/**
 * Find a user by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getUserById(id) {
  return User.findById(id).exec();
}

/**
 * Check whether a plain text password matches the stored password hash.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function checkUserPassword(id, password) {
  const user = await User.findById(id).exec();
  if (!user) return false;
  return user.passwordHash === password;
}

/**
 * Update a user document by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {Partial<{username:string,email:string,passwordHash:string}>} updateData
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function editUser(id, updateData) {
  return User.findByIdAndUpdate(id, updateData, { new: true }).exec();
}

/**
 * Delete a user by its ObjectId.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deleteUserById(id) {
  return User.findByIdAndDelete(id).exec();
}

export { createUser, getUserById, checkUserPassword, editUser, deleteUserById };