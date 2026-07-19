import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

let app;
let userId, token;
let otherToken;

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
    firstName: 'Exp', lastName: 'Tester', email: 'exptester@test.com', password: 'Test1234'
  });
  userId = res.body.userId;
  token = res.body.token;

  const other = await request(app).post('/api/users').send({
    firstName: 'Other', lastName: 'Tester', email: 'otherexptester@test.com', password: 'Test1234'
  });
  otherToken = other.body.token;
});

describe('Expense CRUD', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/expenses').query({ userId });
    expect(res.status).toBe(401);
  });

  it('creates, lists, updates, and deletes an expense', async () => {
    const create = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('userId', userId)
      .field('description', 'Groceries')
      .field('amount', '42.50')
      .field('category', 'Food')
      .field('date', '2026-07-01');
    expect(create.status).toBe(201);
    const expenseId = create.body.expense._id;

    const list = await request(app)
      .get('/api/expenses')
      .query({ userId })
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const update = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .field('amount', '50');
    expect(update.status).toBe(200);
    expect(update.body.expense.amount).toBe(50);

    const del = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it("rejects updating someone else's expense", async () => {
    const create = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('userId', userId)
      .field('description', 'Groceries')
      .field('amount', '42.50')
      .field('category', 'Food')
      .field('date', '2026-07-01');
    const expenseId = create.body.expense._id;

    const update = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .field('amount', '999');
    expect(update.status).toBe(403);
  });
});
