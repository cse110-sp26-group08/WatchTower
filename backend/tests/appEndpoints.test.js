/* eslint-env jest */

import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../app.js';
import { insertApp, selectAppById } from '../schema/appModel.js';
import { insertUser } from '../schema/userModel.js';
import { checkDowntimeStatus } from '../endpoints/apps.js';

/**
 * Mock fetch only for a specific app URL, letting all other fetch calls (e.g. Neon DB)
 * pass through to the real implementation.
 */
function mockFetchForUrl(appUrl, statusOrError) {
  const orig = global.fetch;
  jest.spyOn(global, 'fetch').mockImplementation((url, opts) => {
    if (url === appUrl) {
      if (statusOrError instanceof Error) return Promise.reject(statusOrError);
      return Promise.resolve({ status: statusOrError });
    }
    return orig.call(global, url, opts);
  });
}

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

  test('POST /api/apps with url runs checkDowntimeStatus and populates downOrNot', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });

    mockFetchForUrl('https://example.com', 200);

    const response = await request(app)
      .post('/api/apps')
      .send({ ownerId: user.id, name: 'Monitored App', url: 'https://example.com' });

    jest.restoreAllMocks();

    expect(response.statusCode).toBe(201);
    expect(response.body.app.url).toBe('https://example.com');
    expect(Array.isArray(response.body.app.downOrNot)).toBe(true);
    expect(response.body.app.downOrNot).toEqual([true]);
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

describe('checkDowntimeStatus', () => {
  test('returns true and appends to downOrNot when site is up', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Up Site', url: 'https://up.example.com' });

    mockFetchForUrl('https://up.example.com', 200);
    const result = await checkDowntimeStatus(saved.id);
    jest.restoreAllMocks();

    expect(result).toBe(true);
    const updated = await selectAppById(saved.id);
    expect(updated.downOrNot).toEqual([true]);
  });

  test('returns false and appends to downOrNot when site returns 5xx', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Down Site', url: 'https://down.example.com' });

    mockFetchForUrl('https://down.example.com', 503);
    const result = await checkDowntimeStatus(saved.id);
    jest.restoreAllMocks();

    expect(result).toBe(false);
    const updated = await selectAppById(saved.id);
    expect(updated.downOrNot).toEqual([false]);
  });

  test('returns false and appends to downOrNot when site returns 4xx', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: '404 Site', url: 'https://notfound.example.com' });

    mockFetchForUrl('https://notfound.example.com', 404);
    const result = await checkDowntimeStatus(saved.id);
    jest.restoreAllMocks();

    expect(result).toBe(false);
    const updated = await selectAppById(saved.id);
    expect(updated.downOrNot).toEqual([false]);
  });

  test('returns false and appends when fetch throws (unreachable host)', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Unreachable', url: 'https://unreachable.example.com' });

    mockFetchForUrl('https://unreachable.example.com', new Error('network error'));
    const result = await checkDowntimeStatus(saved.id);
    jest.restoreAllMocks();

    expect(result).toBe(false);
    const updated = await selectAppById(saved.id);
    expect(updated.downOrNot).toEqual([false]);
  });

  test('does not send a DB update when the resulting array is identical', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Stable', url: 'https://stable.example.com' });

    // Fill the buffer to [true, true, true]
    mockFetchForUrl('https://stable.example.com', 200);
    await checkDowntimeStatus(saved.id); // [true]
    await checkDowntimeStatus(saved.id); // [true, true]
    await checkDowntimeStatus(saved.id); // [true, true, true]
    jest.restoreAllMocks();

    const before = await selectAppById(saved.id);
    expect(before.downOrNot).toEqual([true, true, true]);

    // Fourth true: next would be [true, true, true] — identical, so no DB write
    mockFetchForUrl('https://stable.example.com', 200);
    await checkDowntimeStatus(saved.id);
    jest.restoreAllMocks();

    const after = await selectAppById(saved.id);
    expect(after.downOrNot).toEqual([true, true, true]);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  test('updates downOrNot when the window shifts even if the new value matches the last', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Window Shift', url: 'https://shift.example.com' });

    // Build [true, false, true]
    mockFetchForUrl('https://shift.example.com', 200);
    await checkDowntimeStatus(saved.id); // [true]
    jest.restoreAllMocks();

    mockFetchForUrl('https://shift.example.com', 503);
    await checkDowntimeStatus(saved.id); // [true, false]
    jest.restoreAllMocks();

    mockFetchForUrl('https://shift.example.com', 200);
    await checkDowntimeStatus(saved.id); // [true, false, true]
    jest.restoreAllMocks();

    const before = await selectAppById(saved.id);
    expect(before.downOrNot).toEqual([true, false, true]);

    // New true: next = [false, true, true] — different from [true, false, true], so DB IS updated
    mockFetchForUrl('https://shift.example.com', 200);
    await checkDowntimeStatus(saved.id);
    jest.restoreAllMocks();

    const after = await selectAppById(saved.id);
    expect(after.downOrNot).toEqual([false, true, true]);
  });

  test('caps downOrNot at 3 entries (shifts oldest)', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Flapping', url: 'https://flap.example.com' });

    mockFetchForUrl('https://flap.example.com', 200);
    await checkDowntimeStatus(saved.id); // [true]
    jest.restoreAllMocks();

    mockFetchForUrl('https://flap.example.com', 503);
    await checkDowntimeStatus(saved.id); // [true, false]
    jest.restoreAllMocks();

    mockFetchForUrl('https://flap.example.com', 200);
    await checkDowntimeStatus(saved.id); // [true, false, true]
    jest.restoreAllMocks();

    mockFetchForUrl('https://flap.example.com', 503);
    await checkDowntimeStatus(saved.id); // [false, true, false]
    jest.restoreAllMocks();

    const updated = await selectAppById(saved.id);
    expect(updated.downOrNot).toHaveLength(3);
    expect(updated.downOrNot).toEqual([false, true, false]);
  });

  test('returns null for app with no url', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'No URL App' });

    const result = await checkDowntimeStatus(saved.id);

    expect(result).toBeNull();
  });

  test('returns null for unknown app id', async () => {
    const result = await checkDowntimeStatus('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });
});

describe('POST /api/apps/:id/forceStatus', () => {
  const app = createApp();

  test('returns 200 with updated app and isUp when site is up', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Force Up', url: 'https://forceup.example.com' });

    mockFetchForUrl('https://forceup.example.com', 200);
    const response = await request(app).post(`/api/apps/${saved.id}/forceStatus`);
    jest.restoreAllMocks();

    expect(response.statusCode).toBe(200);
    expect(response.body.isUp).toBe(true);
    expect(response.body.app.downOrNot).toEqual([true]);
  });

  test('returns 200 with isUp false when site is down', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'Force Down', url: 'https://forcedown.example.com' });

    mockFetchForUrl('https://forcedown.example.com', 500);
    const response = await request(app).post(`/api/apps/${saved.id}/forceStatus`);
    jest.restoreAllMocks();

    expect(response.statusCode).toBe(200);
    expect(response.body.isUp).toBe(false);
    expect(response.body.app.downOrNot).toEqual([false]);
  });

  test('returns 404 for unknown app', async () => {
    const response = await request(app).post('/api/apps/00000000-0000-0000-0000-000000000000/forceStatus');
    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('App not found');
  });

  test('returns 400 when app has no url', async () => {
    const user = await insertUser({
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
    });
    const saved = await insertApp({ ownerId: user.id, name: 'No URL' });

    const response = await request(app).post(`/api/apps/${saved.id}/forceStatus`);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('App has no URL configured');
  });
});
