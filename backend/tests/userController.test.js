/* eslint-env jest */

import bcrypt from 'bcrypt';
import {
  checkLoginCredentials,
  createUser,
  deleteUserById,
  editUser,
  getUserById,
} from '../controllers/userController.js';
import { User } from '../schema/userModel.js';

describe('userController', () => {
  test('createUser saves a valid user', async () => {
    const user = await createUser({
      username: ' anaya ',
      email: 'ANAYA@example.com',
      password: 'plain-password',
    });

    expect(user._id).toBeDefined();
    expect(user.username).toBe('anaya');
    expect(user.email).toBe('anaya@example.com');
    expect(user.passwordHash).not.toBe('plain-password');
    await expect(bcrypt.compare('plain-password', user.passwordHash)).resolves.toBe(true);

    const savedUser = await User.findById(user._id).exec();
    expect(savedUser).not.toBeNull();
    expect(savedUser.username).toBe('anaya');
  });

  test('createUser rejects invalid user data', async () => {
    await expect(
      createUser({
        username: '',
        email: 'missing-username@example.com',
        password: 'plain-password',
      })
    ).rejects.toThrow('username is required and must be a non-empty string');
  });

  test('checkLoginCredentials returns a safe user for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    await User.create({
      username: 'loginuser',
      email: 'loginuser@example.com',
      passwordHash,
    });

    const user = await checkLoginCredentials('LOGINUSER@example.com', 'correct-password');

    expect(user.username).toBe('loginuser');
    expect(user.email).toBe('loginuser@example.com');
    expect(user.passwordHash).toBeUndefined();
    await expect(
      checkLoginCredentials('loginuser@example.com', 'wrong-password')
    ).resolves.toBeNull();
  });

  test('getUserById returns a saved user', async () => {
    const user = await createUser({
      username: 'owner',
      email: 'owner@example.com',
      password: 'plain-password',
    });

    const foundUser = await getUserById(user._id);

    expect(foundUser._id.toString()).toBe(user._id.toString());
    expect(foundUser.username).toBe('owner');
  });

  test('editUser updates a saved user and ignores unknown fields', async () => {
    const user = await createUser({
      username: 'owner',
      email: 'owner@example.com',
      password: 'plain-password',
    });

    const updatedUser = await editUser(user._id, {
      username: 'updated-owner',
      role: 'admin',
    });
    expect(updatedUser.username).toBe('updated-owner');
    expect(updatedUser.role).toBeUndefined();
    expect(updatedUser.passwordHash).toBeUndefined();

    const savedUser = await User.findById(user._id).exec();
    expect(savedUser.username).toBe('updated-owner');
    expect(savedUser.role).toBeUndefined();
  });

  test('deleteUserById removes a saved user', async () => {
    const user = await createUser({
      username: 'owner',
      email: 'owner@example.com',
      password: 'plain-password',
    });

    const deletedUser = await deleteUserById(user._id);

    expect(deletedUser._id.toString()).toBe(user._id.toString());
    await expect(getUserById(user._id)).resolves.toBeNull();
    await expect(User.findById(user._id).exec()).resolves.toBeNull();
  });
});
