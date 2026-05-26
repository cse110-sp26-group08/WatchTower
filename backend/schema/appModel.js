import crypto from 'crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Mongoose schema for applications registered in WatchTower.
 * @type {import('mongoose').Schema}
 * @property {import('mongoose').Types.ObjectId} ownerId - reference to owning User
 * @property {string} name - application display name
 * @property {string} apiKey - generated API key for app ingestion
 */
const AppSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
      default: () => crypto.randomBytes(32).toString('hex'),
      unique: true,
      index: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const App = mongoose.model('App', AppSchema);

export { AppSchema, App };
