/* eslint-env jest */

import request from 'supertest';
import { createApp } from '../app.js';
import { User } from '../schema/userModel.js';

describe('User endpoints', () => {
  const app = createApp();

  test('POST /api/users creates a user without exposing passwordHash', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        username: ' anaya ',
        email: 'ANAYA@example.com',
        passwordHash: 'hashed-password',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.username).toBe('anaya');
    expect(response.body.user.email).toBe('anaya@example.com');
    expect(response.body.user.passwordHash).toBeUndefined();

    const savedUser = await User.findById(response.body.user._id).exec();
    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).toBe('hashed-password');
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

  test('GET /api/users/:id returns 404 for unknown users', async () => {
    const response = await request(app).get('/api/users/000000000000000000000000');

    expect(response.statusCode).toBe(404);
  });

});
