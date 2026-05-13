/* eslint-env jest */

import mongoose from 'mongoose';
import {
  createEvent,
  deleteEventById,
  getAllEventsByAppId,
  getEventById,
} from '../controllers/eventController.js';

describe('eventController', () => {
  test('createEvent saves a valid event', async () => {
    const appId = new mongoose.Types.ObjectId();

    const event = await createEvent({
      appId,
      type: 'error',
      url: ' https://example.com/page ',
      metadata: { message: 'Something broke' },
    });

    expect(event._id).toBeDefined();
    expect(event.appId.toString()).toBe(appId.toString());
    expect(event.type).toBe('error');
    expect(event.url).toBe('https://example.com/page');
    expect(event.metadata.message).toBe('Something broke');
  });

  test('createEvent rejects an invalid appId', async () => {
    await expect(
      createEvent({
        appId: 'not-an-object-id',
        type: 'error',
      })
    ).rejects.toThrow('Invalid appId');
  });

  test('createEvent rejects an invalid event type', async () => {
    await expect(
      createEvent({
        appId: new mongoose.Types.ObjectId(),
        type: 'unknown',
      })
    ).rejects.toThrow('type must be one of');
  });

  test('query and delete helpers work for saved events', async () => {
    const appId = new mongoose.Types.ObjectId();
    const otherAppId = new mongoose.Types.ObjectId();
    const event = await createEvent({ appId, type: 'performance' });
    await createEvent({ appId: otherAppId, type: 'error' });

    const foundEvent = await getEventById(event._id);
    expect(foundEvent._id.toString()).toBe(event._id.toString());

    const appEvents = await getAllEventsByAppId(appId);
    expect(appEvents).toHaveLength(1);
    expect(appEvents[0]._id.toString()).toBe(event._id.toString());

    const deletedEvent = await deleteEventById(event._id);
    expect(deletedEvent._id.toString()).toBe(event._id.toString());
    await expect(getEventById(event._id)).resolves.toBeNull();
  });
});
