import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

let app;
let userId, token;

beforeAll(async () => {
  await setupTestDB();
  app = (await import('../app.js')).default;
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

beforeEach(async () => {
  const res = await request(app).post('/api/users').send({
    firstName: 'Sub', lastName: 'Tester', email: 'subtester@test.com', password: 'Test1234'
  });
  userId = res.body.userId;
  token = res.body.token;
});

describe('Subscription CRUD', () => {
  it('rejects a negative cost', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId, name: 'Netflix', cost: -10, purchaseDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('rejects requests with no token', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .send({ userId, name: 'Netflix', cost: 15, purchaseDate: '2026-01-01' });
    expect(res.status).toBe(401);
  });

  it('creates, lists, updates, and deletes a subscription', async () => {
    const create = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId, name: 'Netflix', cost: 15.99, purchaseDate: '2026-01-01' });
    expect(create.status).toBe(201);
    const subId = create.body._id;

    const list = await request(app)
      .get('/api/subscriptions')
      .query({ userId })
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const update = await request(app)
      .put(`/api/subscriptions/${subId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Paused' });
    expect(update.status).toBe(200);
    expect(update.body.status).toBe('Paused');

    const del = await request(app)
      .delete(`/api/subscriptions/${subId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const listAfterDelete = await request(app)
      .get('/api/subscriptions')
      .query({ userId })
      .set('Authorization', `Bearer ${token}`);
    expect(listAfterDelete.body.length).toBe(0);
  });
});
