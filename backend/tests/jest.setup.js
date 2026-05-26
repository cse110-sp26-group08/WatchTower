/* eslint-env jest, node */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, disconnectDatabase } from '../util/database.js';

let mongoServer;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '../node_modules/.cache/mongodb-memory-server');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase(mongoServer.getUri());
});

afterEach(async () => {
  if (!mongoose.connection.db) return;

  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await disconnectDatabase();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
