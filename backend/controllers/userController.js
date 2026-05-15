import bcrypt from 'bcrypt';
import { User } from '../schema/userModel.js';
import { isValidId } from '../util/idValidator.js';

const ALLOWED_UPDATE_FIELDS = ['username', 'email'];
const SALT_ROUNDS = 10;

/**
 * Create a new user document.
 * @param {{username:string, email:string, password:string}} userData
 * @returns {Promise<import('mongoose').Document>}
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
 * Check whether login credentials match a saved user.
 * @param {string} email
 * @param {string} password - plain-text password to verify
 * @returns {Promise<object|null>} safe user object when login succeeds, otherwise null
 */
async function checkLoginCredentials(email, password) {
  if (!email || typeof email !== 'string' || !email.trim()) return null;
  if (!password || typeof password !== 'string') return null;

  const user = await User.findOne({ email: email.trim().toLowerCase() }).exec();
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  return safeUser;
}
 
/**
 * Update a user document by its ObjectId.
 * Only whitelisted fields (username, email) are applied.
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {Partial<{username:string, email:string}>} updateData
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

export {
  createUser,
  getUserById,
  checkLoginCredentials,
  editUser,
  deleteUserById,
};
