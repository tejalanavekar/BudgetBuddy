import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

let app;
let token;

beforeAll(async () => {
  await setupTestDB();
  app = (await import('../app.js')).default;
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDB();
});

beforeEach(async () => {
  const res = await request(app).post('/api/users').send({
    firstName: 'Scan', lastName: 'Tester', email: 'scantester@test.com', password: 'Test1234'
  });
  token = res.body.token;
});

describe('POST /api/expenses/scan-receipt — Google Vision key placement', () => {
  it('sends the API key as a header, never in the request URL', async () => {
    const axios = (await import('axios')).default;
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { responses: [{ fullTextAnnotation: { text: 'TOTAL\n12.34' } }] }
    });

    const res = await request(app)
      .post('/api/expenses/scan-receipt')
      .set('Authorization', `Bearer ${token}`)
      .attach('receipt', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]), 'receipt.jpg');

    expect(res.status).toBe(200);
    expect(postSpy).toHaveBeenCalledTimes(1);

    const [url, , config] = postSpy.mock.calls[0];
    expect(url).not.toContain('key=');
    expect(url).not.toContain(process.env.GOOGLE_VISION_API_KEY);
    expect(config.headers['X-Goog-Api-Key']).toBe(process.env.GOOGLE_VISION_API_KEY);
  });
});
