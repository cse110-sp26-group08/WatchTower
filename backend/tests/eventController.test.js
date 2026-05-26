/* eslint-env jest */

import {
  createEvent,
  deleteEventById,
  getAllEventsByAppId,
  getEventById,
} from '../controllers/eventController.js';
import { selectEventById } from '../schema/eventModel.js';

describe('eventController', () => {
  test('createEvent saves a valid event', async () => {
    const appId = crypto.randomUUID();

    const event = await createEvent({
      appId,
      type: 'error',
      url: ' https://example.com/page ',
      metadata: { message: 'Something broke' },
    });

    expect(event.id).toBeDefined();
    expect(event.appId).toBe(appId);
    expect(event.type).toBe('error');
    expect(event.url).toBe('https://example.com/page');
    expect(event.metadata.message).toBe('Something broke');

    const savedEvent = await selectEventById(event.id);
    expect(savedEvent).not.toBeNull();
    expect(savedEvent.metadata.message).toBe('Something broke');
  });

  test('createEvent rejects an invalid appId', async () => {
    await expect(
      createEvent({
        appId: 'not-a-uuid',
        type: 'error',
      })
    ).rejects.toThrow('Invalid appId');
  });

  test('createEvent rejects an invalid event type', async () => {
    await expect(
      createEvent({
        appId: crypto.randomUUID(),
        type: 'unknown',
      })
    ).rejects.toThrow('type must be one of');
  });

  test('getEventById returns a saved event', async () => {
    const appId = crypto.randomUUID();
    const event = await createEvent({ appId, type: 'performance' });

    const foundEvent = await getEventById(event.id);

    expect(foundEvent.id).toBe(event.id);
    expect(foundEvent.type).toBe('performance');
  });

  test('getAllEventsByAppId returns only events for that app', async () => {
    const appId = crypto.randomUUID();
    const otherAppId = crypto.randomUUID();
    const event = await createEvent({ appId, type: 'performance' });
    await createEvent({ appId: otherAppId, type: 'error' });

    const appEvents = await getAllEventsByAppId(appId);

    expect(appEvents).toHaveLength(1);
    expect(appEvents[0].id).toBe(event.id);
  });

  test('deleteEventById removes a saved event', async () => {
    const appId = crypto.randomUUID();
    const event = await createEvent({ appId, type: 'performance' });

    const deletedEvent = await deleteEventById(event.id);

    expect(deletedEvent.id).toBe(event.id);
    await expect(getEventById(event.id)).resolves.toBeNull();
    await expect(selectEventById(event.id)).resolves.toBeNull();
  });
});
