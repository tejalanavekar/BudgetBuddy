import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

let app;
let userAId, userAToken;
let userBToken;

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
  const a = await request(app).post('/api/users').send({
    firstName: 'A', lastName: 'User', email: 'usera@test.com', password: 'Test1234'
  });
  userAId = a.body.userId;
  userAToken = a.body.token;

  const b = await request(app).post('/api/users').send({
    firstName: 'B', lastName: 'User', email: 'userb@test.com', password: 'Test1234'
  });
  userBToken = b.body.token;
});

describe('Budget routes — auth and ownership', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get(`/api/budgets/${userAId}/all`);
    expect(res.status).toBe(401);
  });

  it("rejects a token that doesn't match the userId in the URL", async () => {
    const res = await request(app)
      .get(`/api/budgets/${userAId}/all`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(403);
  });

  it("allows a user to access their own budgets", async () => {
    const res = await request(app)
      .get(`/api/budgets/${userAId}/all`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Budget CRUD', () => {
  it('rejects a negative budget amount', async () => {
    const res = await request(app)
      .post(`/api/budgets/${userAId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ monthYear: '2026-07', totalMonthlyBudget: -5 });
    expect(res.status).toBe(400);
  });

  it('creates, fetches, and deletes a budget', async () => {
    const create = await request(app)
      .post(`/api/budgets/${userAId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ monthYear: '2026-07', totalMonthlyBudget: 500 });
    expect(create.status).toBe(200);
    expect(create.body.budget.totalMonthlyBudget).toBe(500);

    const get = await request(app)
      .get(`/api/budgets/${userAId}/2026-07`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(get.body.budget.totalMonthlyBudget).toBe(500);

    const del = await request(app)
      .delete(`/api/budgets/${userAId}/2026-07`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(del.status).toBe(200);

    const getAfterDelete = await request(app)
      .get(`/api/budgets/${userAId}/2026-07`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getAfterDelete.body.budget).toBeNull();
  });
});
