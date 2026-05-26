/* eslint-env node */

import mongoose from 'mongoose';

/**
 * Connect Mongoose to MongoDB.
 * @param {string | undefined} uri - MongoDB connection string.
 * @returns {Promise<typeof mongoose>}
 */
async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB');
  }

  return mongoose.connect(uri);
}

/**
 * Disconnect Mongoose from MongoDB.
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  await mongoose.disconnect();
}

export { connectDatabase, disconnectDatabase };
