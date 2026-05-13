import request from 'supertest';
import { createApp } from '../app.js';

describe('Collector endpoints', () => {
  const app = createApp();

  test('POST /api/collect/error returns 400 without required fields', async () => {
    const response = await request(app)
      .post('/api/collect/error')
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test('POST /api/collect/performance returns 400 without appId', async () => {
    const response = await request(app)
      .post('/api/collect/performance')
      .send({});

    expect(response.statusCode).toBe(400);
  });
});