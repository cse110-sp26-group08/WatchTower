/* eslint-env jest */

import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { Event } from '../schema/eventModel.js';

describe('Collector endpoints', () => {
  const app = createApp();

  test('POST /api/collect/error returns 400 without required fields', async () => {
    const response = await request(app)
      .post('/api/collect/error')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/collect/error saves an error event', async () => {
    const appId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post('/api/collect/error')
      .send({
        appId: appId.toString(),
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
    expect(savedEvent.appId.toString()).toBe(appId.toString());
  });

  test('POST /api/collect/performance returns 400 without appId', async () => {
    const response = await request(app)
      .post('/api/collect/performance')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/collect/performance saves a performance event', async () => {
    const appId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post('/api/collect/performance')
      .send({
        appId: appId.toString(),
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
    expect(savedEvent.appId.toString()).toBe(appId.toString());
  });
});
