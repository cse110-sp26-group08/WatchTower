/* eslint-env jest */

import request from 'supertest';
import { createAdaptorServer } from '@hono/node-server';
import { db } from '../util/database.js';
import { count } from 'drizzle-orm';
import { createApp } from '../app.js';
import { insertApp } from '../schema/appModel.js';
import { insertEvent, selectEventById, events } from '../schema/eventModel.js';

describe('Event endpoints', () => {
  const server = createAdaptorServer(createApp());

  test('POST /api/events/error returns 400 without required fields', async () => {
    const response = await request(server)
      .post('/api/events/error')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/events/error saves an error event', async () => {
    const savedApp = await insertApp({ ownerId: crypto.randomUUID(), name: 'Web' });

    const response = await request(server)
      .post('/api/events/error')
      .send({
        apiKey: savedApp.apiKey,
        message: 'Something broke',
        stack: 'Error: Something broke',
        url: 'https://example.com/dashboard',
        errorType: 'Error',
        severity: 'high',
        release: '1.0.0',
      });
    expect(response.statusCode).toBe(201);
    expect(response.body.event.type).toBe('error');
    expect(response.body.event.metadata.message).toBe('Something broke');

    const savedEvent = await selectEventById(response.body.event.id);
    expect(savedEvent).not.toBeNull();
    expect(savedEvent.appId).toBe(savedApp.id);
  });

  test('POST /api/events/error returns 401 with an invalid apiKey', async () => {
    const response = await request(server)
      .post('/api/events/error')
      .send({
        apiKey: 'invalid-api-key',
        message: 'Something broke',
      });

    expect(response.statusCode).toBe(401);
    const [{ total }] = await db.select({ total: count() }).from(events);
    expect(Number(total)).toBe(0);
  });

  test('POST /api/events/performance returns 400 without apiKey', async () => {
    const response = await request(server)
      .post('/api/events/performance')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/events/performance saves a performance event', async () => {
    const savedApp = await insertApp({ ownerId: crypto.randomUUID(), name: 'Web' });

    const response = await request(server)
      .post('/api/events/performance')
      .send({
        apiKey: savedApp.apiKey,
        loadTimeMs: 1200,
        domContentLoadedMs: 800,
        ttfbMs: 100,
        apiEndpoint: '/api/widgets',
        apiLatencyMs: 250,
        memoryMB: 64,
        url: 'https://example.com/dashboard',
        release: '1.0.0',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.event.type).toBe('performance');
    expect(response.body.event.metadata.loadTimeMs).toBe(1200);

    const savedEvent = await selectEventById(response.body.event.id);
    expect(savedEvent).not.toBeNull();
    expect(savedEvent.appId).toBe(savedApp.id);
  });

  test('POST /api/events/performance returns 401 with an invalid apiKey', async () => {
    const response = await request(server)
      .post('/api/events/performance')
      .send({
        apiKey: 'invalid-api-key',
        loadTimeMs: 1200,
      });

    expect(response.statusCode).toBe(401);
    const [{ total }] = await db.select({ total: count() }).from(events);
    expect(Number(total)).toBe(0);
  });

  test('GET /api/events/error/:id returns a saved error event', async () => {
    const event = await insertEvent({
      appId: crypto.randomUUID(),
      type: 'error',
      timestamp: new Date(),
      receivedAt: new Date(),
      metadata: { message: 'Something broke' },
    });

    const getResponse = await request(server).get(`/api/events/error/${event.id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.event.type).toBe('error');
    expect(getResponse.body.event.metadata.message).toBe('Something broke');
  });

  test('DELETE /api/events/error/:id deletes a saved error event', async () => {
    const event = await insertEvent({
      appId: crypto.randomUUID(),
      type: 'error',
      timestamp: new Date(),
      receivedAt: new Date(),
      metadata: { message: 'Something broke' },
    });

    const deleteResponse = await request(server).delete(`/api/events/error/${event.id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.event.id).toBe(event.id);
    await expect(selectEventById(event.id)).resolves.toBeNull();
  });

  test('GET /api/events/error/apps/:appId lists error events for an app', async () => {
    const appId = crypto.randomUUID();
    const otherAppId = crypto.randomUUID();
    await insertEvent({ appId, type: 'error', timestamp: new Date(), receivedAt: new Date() });
    await insertEvent({ appId, type: 'performance', timestamp: new Date(), receivedAt: new Date() });
    await insertEvent({ appId: otherAppId, type: 'error', timestamp: new Date(), receivedAt: new Date() });

    const response = await request(server).get(`/api/events/error/apps/${appId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0].type).toBe('error');
  });

  test('GET /api/events/performance/:id returns a saved performance event', async () => {
    const event = await insertEvent({
      appId: crypto.randomUUID(),
      type: 'performance',
      timestamp: new Date(),
      receivedAt: new Date(),
      metadata: { loadTimeMs: 1200 },
    });

    const getResponse = await request(server).get(`/api/events/performance/${event.id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.event.type).toBe('performance');
    expect(getResponse.body.event.metadata.loadTimeMs).toBe(1200);
  });

  test('DELETE /api/events/performance/:id deletes a saved performance event', async () => {
    const event = await insertEvent({
      appId: crypto.randomUUID(),
      type: 'performance',
      timestamp: new Date(),
      receivedAt: new Date(),
      metadata: { loadTimeMs: 1200 },
    });

    const deleteResponse = await request(server).delete(`/api/events/performance/${event.id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.event.id).toBe(event.id);
    await expect(selectEventById(event.id)).resolves.toBeNull();
  });

  test('GET /api/events/performance/apps/:appId lists performance events for an app', async () => {
    const appId = crypto.randomUUID();
    const otherAppId = crypto.randomUUID();
    await insertEvent({ appId, type: 'error', timestamp: new Date(), receivedAt: new Date() });
    await insertEvent({ appId, type: 'performance', timestamp: new Date(), receivedAt: new Date() });
    await insertEvent({ appId: otherAppId, type: 'performance', timestamp: new Date(), receivedAt: new Date() });

    const response = await request(server).get(`/api/events/performance/apps/${appId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0].type).toBe('performance');
  });

  test('typed event routes return 404 for unknown or mismatched events', async () => {
    const performanceEvent = await insertEvent({
      appId: crypto.randomUUID(),
      type: 'performance',
      timestamp: new Date(),
      receivedAt: new Date(),
    });

    const unknownResponse = await request(server).get('/api/events/error/00000000-0000-0000-0000-000000000000');
    const mismatchResponse = await request(server).get(`/api/events/error/${performanceEvent.id}`);

    expect(unknownResponse.statusCode).toBe(404);
    expect(mismatchResponse.statusCode).toBe(404);
  });
});
