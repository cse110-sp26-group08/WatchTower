/* eslint-env jest */

import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { App } from '../schema/appModel.js';
import { Event } from '../schema/eventModel.js';

describe('Event endpoints', () => {
  const app = createApp();

  test('POST /api/events/error returns 400 without required fields', async () => {
    const response = await request(app)
      .post('/api/events/error')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/events/error saves an error event', async () => {
    const savedApp = await App.create({ ownerId: new mongoose.Types.ObjectId(), name: 'Web' });

    const response = await request(app)
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

    const savedEvent = await Event.findById(response.body.event._id).exec();
    expect(savedEvent).not.toBeNull();
    expect(savedEvent.appId.toString()).toBe(savedApp._id.toString());
  });

  test('POST /api/events/error returns 401 with an invalid apiKey', async () => {
    const response = await request(app)
      .post('/api/events/error')
      .send({
        apiKey: 'invalid-api-key',
        message: 'Something broke',
      });

    expect(response.statusCode).toBe(401);
    await expect(Event.countDocuments().exec()).resolves.toBe(0);
  });

  test('POST /api/events/performance returns 400 without apiKey', async () => {
    const response = await request(app)
      .post('/api/events/performance')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/events/performance saves a performance event', async () => {
    const savedApp = await App.create({ ownerId: new mongoose.Types.ObjectId(), name: 'Web' });

    const response = await request(app)
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

    const savedEvent = await Event.findById(response.body.event._id).exec();
    expect(savedEvent).not.toBeNull();
    expect(savedEvent.appId.toString()).toBe(savedApp._id.toString());
  });

  test('POST /api/events/performance returns 401 with an invalid apiKey', async () => {
    const response = await request(app)
      .post('/api/events/performance')
      .send({
        apiKey: 'invalid-api-key',
        loadTimeMs: 1200,
      });

    expect(response.statusCode).toBe(401);
    await expect(Event.countDocuments().exec()).resolves.toBe(0);
  });

  test('GET /api/events/error/:id returns a saved error event', async () => {
    const appId = new mongoose.Types.ObjectId();
    const event = await Event.create({
      appId,
      type: 'error',
      metadata: { message: 'Something broke' },
    });

    const getResponse = await request(app).get(`/api/events/error/${event._id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.event.type).toBe('error');
    expect(getResponse.body.event.metadata.message).toBe('Something broke');
  });

  test('DELETE /api/events/error/:id deletes a saved error event', async () => {
    const appId = new mongoose.Types.ObjectId();
    const event = await Event.create({
      appId,
      type: 'error',
      metadata: { message: 'Something broke' },
    });

    const deleteResponse = await request(app).delete(`/api/events/error/${event._id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.event._id).toBe(event._id.toString());
    await expect(Event.findById(event._id).exec()).resolves.toBeNull();
  });

  test('GET /api/events/error/apps/:appId lists error events for an app', async () => {
    const appId = new mongoose.Types.ObjectId();
    const otherAppId = new mongoose.Types.ObjectId();
    await Event.create({ appId, type: 'error' });
    await Event.create({ appId, type: 'performance' });
    await Event.create({ appId: otherAppId, type: 'error' });

    const response = await request(app).get(`/api/events/error/apps/${appId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0].type).toBe('error');
  });

  test('GET /api/events/performance/:id returns a saved performance event', async () => {
    const appId = new mongoose.Types.ObjectId();
    const event = await Event.create({
      appId,
      type: 'performance',
      metadata: { loadTimeMs: 1200 },
    });

    const getResponse = await request(app).get(`/api/events/performance/${event._id}`);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.event.type).toBe('performance');
    expect(getResponse.body.event.metadata.loadTimeMs).toBe(1200);
  });

  test('DELETE /api/events/performance/:id deletes a saved performance event', async () => {
    const appId = new mongoose.Types.ObjectId();
    const event = await Event.create({
      appId,
      type: 'performance',
      metadata: { loadTimeMs: 1200 },
    });

    const deleteResponse = await request(app).delete(`/api/events/performance/${event._id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.event._id).toBe(event._id.toString());
    await expect(Event.findById(event._id).exec()).resolves.toBeNull();
  });

  test('GET /api/events/performance/apps/:appId lists performance events for an app', async () => {
    const appId = new mongoose.Types.ObjectId();
    const otherAppId = new mongoose.Types.ObjectId();
    await Event.create({ appId, type: 'error' });
    await Event.create({ appId, type: 'performance' });
    await Event.create({ appId: otherAppId, type: 'performance' });

    const response = await request(app).get(`/api/events/performance/apps/${appId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0].type).toBe('performance');
  });

  test('typed event routes return 404 for unknown or mismatched events', async () => {
    const performanceEvent = await Event.create({
      appId: new mongoose.Types.ObjectId(),
      type: 'performance',
    });

    const unknownResponse = await request(app).get('/api/events/error/000000000000000000000000');
    const mismatchResponse = await request(app).get(`/api/events/error/${performanceEvent._id}`);

    expect(unknownResponse.statusCode).toBe(404);
    expect(mismatchResponse.statusCode).toBe(404);
  });
});
