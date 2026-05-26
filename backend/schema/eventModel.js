import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Mongoose schema for app events.
 * @type {import('mongoose').Schema}
 * @property {import('mongoose').Types.ObjectId} appId - reference to associated App
 * @property {string} type - event category (error, performance, feedback, release)
 * @property {Date} timestamp - event occurrence time
 * @property {string} [url] - URL where the event occurred
 * @property {Object} metadata - arbitrary event metadata
 * @property {Date} receivedAt - ingestion timestamp
 */
const EventSchema = new Schema(
  {
    appId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'App',
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['error', 'performance', 'feedback', 'release'],
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    url: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

const Event = mongoose.model('Event', EventSchema);

export { EventSchema, Event };