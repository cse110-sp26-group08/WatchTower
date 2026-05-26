/* eslint-env jest */

import request from 'supertest';
import { createApp } from '../app.js';
import { App } from '../schema/appModel.js';
import { User } from '../schema/userModel.js';

describe('App endpoints', () => {
  const app = createApp();

  test('POST /api/apps creates an app for an owner', async () => {
    const user = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });

    const response = await request(app)
      .post('/api/apps')
      .send({ ownerId: user._id.toString(), name: ' WatchTower Web ' });

    expect(response.statusCode).toBe(201);
    expect(response.body.app.name).toBe('WatchTower Web');
    expect(response.body.app.ownerId).toBe(user._id.toString());
    expect(response.body.app.apiKey).toBeUndefined();

    const savedApp = await App.findById(response.body.app._id).exec();
    expect(savedApp).not.toBeNull();
  });

  test('POST /api/apps returns 400 for invalid app payloads', async () => {
    const response = await request(app)
      .post('/api/apps')
      .send({ ownerId: 'not-an-object-id', name: 'Broken App' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Invalid ownerId');
  });

  test('GET /api/apps/:id returns a saved app', async () => {
    const user = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const savedApp = await App.create({ ownerId: user._id, name: 'API' });

    const getResponse = await request(app).get(`/api/apps/${savedApp._id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.app.name).toBe('API');
    expect(getResponse.body.app.apiKey).toBeUndefined();
  });

  test('DELETE /api/apps/:id deletes a saved app', async () => {
    const user = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const savedApp = await App.create({ ownerId: user._id, name: 'API' });

    const deleteResponse = await request(app).delete(`/api/apps/${savedApp._id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.app._id).toBe(savedApp._id.toString());
    await expect(App.findById(savedApp._id).exec()).resolves.toBeNull();
  });

  test('GET /api/apps/users/:ownerId lists apps for a user', async () => {
    const owner = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const otherOwner = await User.create({
      username: 'other',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    });
    await App.create({ ownerId: owner._id, name: 'Web' });
    await App.create({ ownerId: owner._id, name: 'API' });
    await App.create({ ownerId: otherOwner._id, name: 'Other' });

    const response = await request(app).get(`/api/apps/users/${owner._id}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.apps).toHaveLength(2);
    expect(response.body.apps.map((ownerApp) => ownerApp.name).sort()).toEqual(['API', 'Web']);
  });

  test('GET /api/apps/:id returns 404 for unknown apps', async () => {
    const response = await request(app).get('/api/apps/000000000000000000000000');

    expect(response.statusCode).toBe(404);
  });
});
