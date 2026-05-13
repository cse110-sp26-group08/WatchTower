import crypto from 'crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

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
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

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

const User = mongoose.model('User', UserSchema);
const App = mongoose.model('App', AppSchema);
const Event = mongoose.model('Event', EventSchema);

export { UserSchema, AppSchema, EventSchema, User, App, Event };
