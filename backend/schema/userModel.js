import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Mongoose schema for WatchTower users.
 * @type {import('mongoose').Schema}
 * @property {string} username - unique, trimmed username
 * @property {string} email - unique, lowercase email address
 * @property {string} passwordHash - hashed user password
 */
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

const User = mongoose.model('User', UserSchema);

export { UserSchema, User };