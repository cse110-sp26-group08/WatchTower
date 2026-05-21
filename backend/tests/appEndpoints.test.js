/* eslint-env jest */

import request from 'supertest';
import { createApp } from '../app.js';
import { insertApp, selectAppById } from '../schema/appModel.js';
import { insertUser } from '../schema/userModel.js';

describe('App endpoints', () => {
  const app = createApp();

  test('POST /api/apps creates an app for an owner', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });

    const response = await request(app)
      .post('/api/apps')
      .send({ ownerId: user.id, name: ' WatchTower Web ' });

    expect(response.statusCode).toBe(201);
    expect(response.body.app.name).toBe('WatchTower Web');
    expect(response.body.app.ownerId).toBe(user.id);
    expect(response.body.app.apiKey).toBeUndefined();

    const savedApp = await selectAppById(response.body.app.id);
    expect(savedApp).not.toBeNull();
  });

  test('POST /api/apps returns 400 for invalid app payloads', async () => {
    const response = await request(app)
      .post('/api/apps')
      .send({ ownerId: 'not-a-uuid', name: 'Broken App' });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Invalid ownerId');
  });

  test('GET /api/apps/:id returns a saved app', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const savedApp = await insertApp({ ownerId: user.id, name: 'API' });

    const getResponse = await request(app).get(`/api/apps/${savedApp.id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.app.name).toBe('API');
    expect(getResponse.body.app.apiKey).toBeUndefined();
  });

  test('DELETE /api/apps/:id deletes a saved app', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const savedApp = await insertApp({ ownerId: user.id, name: 'API' });

    const deleteResponse = await request(app).delete(`/api/apps/${savedApp.id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.app.id).toBe(savedApp.id);
    await expect(selectAppById(savedApp.id)).resolves.toBeNull();
  });

  test('GET /api/apps/users/:ownerId lists apps for a user', async () => {
    const owner = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const otherOwner = await insertUser({
      username: 'other',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    });
    await insertApp({ ownerId: owner.id, name: 'Web' });
    await insertApp({ ownerId: owner.id, name: 'API' });
    await insertApp({ ownerId: otherOwner.id, name: 'Other' });

    const response = await request(app).get(`/api/apps/users/${owner.id}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.apps).toHaveLength(2);
    expect(response.body.apps.map((ownerApp) => ownerApp.name).sort()).toEqual(['API', 'Web']);
  });

  test('GET /api/apps/:id returns 404 for unknown apps', async () => {
    const response = await request(app).get('/api/apps/00000000-0000-0000-0000-000000000000');

    expect(response.statusCode).toBe(404);
  });
});
