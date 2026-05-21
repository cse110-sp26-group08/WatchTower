/* eslint-env jest */

import {
  createApp,
  deleteAppById,
  getAllAppsByOwnerId,
  getAppByApiKey,
  getAppById,
} from '../controllers/appController.js';
import { selectAppById } from '../schema/appModel.js';

describe('appController', () => {
  test('createApp saves a valid app', async () => {
    const ownerId = crypto.randomUUID();

    const app = await createApp({
      ownerId,
      name: ' WatchTower Web ',
    });

    expect(app.id).toBeDefined();
    expect(app.ownerId).toBe(ownerId);
    expect(app.name).toBe('WatchTower Web');
    expect(app.apiKey).toBeDefined();

    const savedApp = await selectAppById(app.id);
    expect(savedApp).not.toBeNull();
    expect(savedApp.name).toBe('WatchTower Web');
  });

  test('createApp saves url when provided', async () => {
    const ownerId = crypto.randomUUID();

    const app = await createApp({
      ownerId,
      name: 'Monitored App',
      url: '  https://example.com  ',
    });

    expect(app.url).toBe('https://example.com');

    const savedApp = await selectAppById(app.id);
    expect(savedApp.url).toBe('https://example.com');
    expect(Array.isArray(savedApp.downOrNot)).toBe(true);
    expect(savedApp.downOrNot).toEqual([]);
  });

  test('createApp saves without url when not provided', async () => {
    const ownerId = crypto.randomUUID();

    const app = await createApp({ ownerId, name: 'No URL App' });

    expect(app.url).toBeNull();
    const savedApp = await selectAppById(app.id);
    expect(savedApp.url).toBeNull();
    expect(savedApp.downOrNot).toEqual([]);
  });

  test('getAppByApiKey returns a saved app with its apiKey', async () => {
    const ownerId = crypto.randomUUID();
    const app = await createApp({ ownerId, name: 'API' });

    const foundApp = await getAppByApiKey(app.apiKey);

    expect(foundApp.id).toBe(app.id);
    expect(foundApp.apiKey).toBe(app.apiKey);
  });

  test('createApp rejects invalid app data', async () => {
    await expect(
      createApp({
        ownerId: 'not-a-uuid',
        name: 'Broken App',
      })
    ).rejects.toThrow('Invalid ownerId');
  });

  test('getAppById returns a saved app', async () => {
    const ownerId = crypto.randomUUID();
    const app = await createApp({ ownerId, name: 'API' });

    const foundApp = await getAppById(app.id);

    expect(foundApp.id).toBe(app.id);
    expect(foundApp.name).toBe('API');
  });

  test('getAllAppsByOwnerId returns only apps for that owner', async () => {
    const ownerId = crypto.randomUUID();
    const otherOwnerId = crypto.randomUUID();
    const app = await createApp({ ownerId, name: 'API' });
    await createApp({ ownerId: otherOwnerId, name: 'Other' });

    const ownerApps = await getAllAppsByOwnerId(ownerId);

    expect(ownerApps).toHaveLength(1);
    expect(ownerApps[0].id).toBe(app.id);
  });

  test('deleteAppById removes a saved app', async () => {
    const ownerId = crypto.randomUUID();
    const app = await createApp({ ownerId, name: 'API' });

    const deletedApp = await deleteAppById(app.id);

    expect(deletedApp.id).toBe(app.id);
    await expect(getAppById(app.id)).resolves.toBeNull();
    await expect(selectAppById(app.id)).resolves.toBeNull();
  });
});
