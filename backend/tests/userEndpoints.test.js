/* eslint-env jest */

import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../app.js';
import { User } from '../schema/userModel.js';

describe('User endpoints', () => {
  const app = createApp();

  test('POST /api/users hashes password and does not expose passwordHash', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        username: ' anaya ',
        email: 'ANAYA@example.com',
        password: 'plain-password',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.username).toBe('anaya');
    expect(response.body.user.email).toBe('anaya@example.com');
    expect(response.body.user.passwordHash).toBeUndefined();

    const savedUser = await User.findById(response.body.user._id).exec();
    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).not.toBe('plain-password');
    await expect(bcrypt.compare('plain-password', savedUser.passwordHash)).resolves.toBe(true);
  });

  test('POST /api/users returns 400 for invalid user payloads', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'missing-username@example.com' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('username is required and must be a non-empty string');
  });

  test('GET /api/users/:id returns a saved user', async () => {
    const user = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });

    const getResponse = await request(app).get(`/api/users/${user._id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.user.username).toBe('owner');
    expect(getResponse.body.user.passwordHash).toBeUndefined();
  });

  test('PATCH /api/users/:id updates a saved user', async () => {
    const user = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });

    const patchResponse = await request(app)
      .patch(`/api/users/${user._id}`)
      .send({ username: 'updated-owner', role: 'admin' });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.body.user.username).toBe('updated-owner');
    expect(patchResponse.body.user.role).toBeUndefined();
    expect(patchResponse.body.user.passwordHash).toBeUndefined();

    const savedUser = await User.findById(user._id).exec();
    expect(savedUser.username).toBe('updated-owner');
    expect(savedUser.role).toBeUndefined();
  });

  test('DELETE /api/users/:id deletes a saved user', async () => {
    const user = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });

    const deleteResponse = await request(app).delete(`/api/users/${user._id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.user._id).toBe(user._id.toString());
    await expect(User.findById(user._id).exec()).resolves.toBeNull();
  });

  test('POST /login saves safe user data in the session on successful login', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    await User.create({
      username: 'loginendpoint',
      email: 'loginendpoint@example.com',
      passwordHash,
    });

    const response = await request(app)
      .post('/login')
      .send({
        email: 'loginendpoint@example.com',
        password: 'correct-password',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.user.username).toBe('loginendpoint');
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('POST /login returns 401 for invalid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    await User.create({
      username: 'failedlogin',
      email: 'failedlogin@example.com',
      passwordHash,
    });

    const response = await request(app)
      .post('/login')
      .send({
        email: 'failedlogin@example.com',
        password: 'wrong-password',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test('POST /signup creates a user, hashes password, and saves session', async () => {
    const response = await request(app)
      .post('/signup')
      .send({
        username: 'signupuser',
        email: 'signupuser@example.com',
        password: 'plain-password',
        confirmPassword: 'plain-password',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.username).toBe('signupuser');
    expect(response.body.user.email).toBe('signupuser@example.com');
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie']).toBeDefined();

    const savedUser = await User.findById(response.body.user._id).exec();
    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).not.toBe('plain-password');
    await expect(bcrypt.compare('plain-password', savedUser.passwordHash)).resolves.toBe(true);
  });

  test('POST /signup returns 400 when passwords do not match', async () => {
    const response = await request(app)
      .post('/signup')
      .send({
        username: 'mismatchuser',
        email: 'mismatchuser@example.com',
        password: 'plain-password',
        confirmPassword: 'different-password',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Passwords do not match');
    expect(response.headers['set-cookie']).toBeUndefined();

    const savedUser = await User.findOne({ email: 'mismatchuser@example.com' }).exec();
    expect(savedUser).toBeNull();
  });

  test('GET /api/users/:id returns 404 for unknown users', async () => {
    const response = await request(app).get('/api/users/000000000000000000000000');

    expect(response.statusCode).toBe(404);
  });

});
