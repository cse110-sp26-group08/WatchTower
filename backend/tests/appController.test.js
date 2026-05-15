/* eslint-env jest */

import mongoose from 'mongoose';
import {
  createApp,
  deleteAppById,
  getAllAppsByOwnerId,
  getAppByApiKey,
  getAppById,
} from '../controllers/appController.js';
import { App } from '../schema/appModel.js';

describe('appController', () => {
  test('createApp saves a valid app', async () => {
    const ownerId = new mongoose.Types.ObjectId();

    const app = await createApp({
      ownerId,
      name: ' WatchTower Web ',
    });

    expect(app._id).toBeDefined();
    expect(app.ownerId.toString()).toBe(ownerId.toString());
    expect(app.name).toBe('WatchTower Web');
    expect(app.apiKey).toBeDefined();

    const savedApp = await App.findById(app._id).exec();
    expect(savedApp).not.toBeNull();
    expect(savedApp.name).toBe('WatchTower Web');
  });

  test('getAppByApiKey returns a saved app with its apiKey', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const app = await createApp({ ownerId, name: 'API' });

    const foundApp = await getAppByApiKey(app.apiKey);

    expect(foundApp._id.toString()).toBe(app._id.toString());
    expect(foundApp.apiKey).toBe(app.apiKey);
  });

  test('createApp rejects invalid app data', async () => {
    await expect(
      createApp({
        ownerId: 'not-an-object-id',
        name: 'Broken App',
      })
    ).rejects.toThrow('Invalid ownerId');
  });

  test('getAppById returns a saved app', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const app = await createApp({ ownerId, name: 'API' });

    const foundApp = await getAppById(app._id);

    expect(foundApp._id.toString()).toBe(app._id.toString());
    expect(foundApp.name).toBe('API');
  });

  test('getAllAppsByOwnerId returns only apps for that owner', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const otherOwnerId = new mongoose.Types.ObjectId();
    const app = await createApp({ ownerId, name: 'API' });
    await createApp({ ownerId: otherOwnerId, name: 'Other' });

    const ownerApps = await getAllAppsByOwnerId(ownerId);

    expect(ownerApps).toHaveLength(1);
    expect(ownerApps[0]._id.toString()).toBe(app._id.toString());
  });

  test('deleteAppById removes a saved app', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const app = await createApp({ ownerId, name: 'API' });

    const deletedApp = await deleteAppById(app._id);

    expect(deletedApp._id.toString()).toBe(app._id.toString());
    await expect(getAppById(app._id)).resolves.toBeNull();
    await expect(App.findById(app._id).exec()).resolves.toBeNull();
  });
});
