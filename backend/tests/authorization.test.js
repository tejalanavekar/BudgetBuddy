import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

let app;
let tokenA, tokenB, userIdA, expenseIdA, subscriptionIdA;

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
    firstName: 'User', lastName: 'A', email: 'usera@test.com', password: 'Test1234'
  });
  tokenA = a.body.token;
  userIdA = a.body.userId;

  const b = await request(app).post('/api/users').send({
    firstName: 'User', lastName: 'B', email: 'userb@test.com', password: 'Test1234'
  });
  tokenB = b.body.token;

  const expense = await request(app)
    .post('/api/expenses')
    .set('Authorization', `Bearer ${tokenA}`)
    .field('userId', userIdA)
    .field('description', 'A groceries')
    .field('amount', '10')
    .field('category', 'Food')
    .field('date', '2026-01-01');
  expenseIdA = expense.body.expense._id;

  const sub = await request(app)
    .post('/api/subscriptions')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ userId: userIdA, name: 'Netflix', cost: 10, purchaseDate: '2026-01-01' });
  subscriptionIdA = sub.body._id;

  await request(app)
    .post(`/api/budgets/${userIdA}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ monthYear: '2026-01', totalMonthlyBudget: 500 });
});

describe('Cross-user authorization — B must never touch A\'s data', () => {
  it('cannot list A\'s expenses by passing A\'s id as query userId', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('cannot create an expense tagged as A by passing A\'s id in the body', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${tokenB}`)
      .field('userId', userIdA)
      .field('description', 'Spoofed')
      .field('amount', '5')
      .field('category', 'Food')
      .field('date', '2026-01-01');
    expect(res.status).toBe(201);
    expect(res.body.expense.userId).not.toBe(userIdA);

    const listA = await request(app)
      .get('/api/expenses')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listA.body.find(e => e.description === 'Spoofed')).toBeUndefined();
  });

  it('cannot update or delete A\'s expense, gets 404 not 403', async () => {
    const update = await request(app)
      .put(`/api/expenses/${expenseIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .field('description', 'Hacked');
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete(`/api/expenses/${expenseIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(del.status).toBe(404);
  });

  it('cannot wipe A\'s month via clear-month using A\'s id', async () => {
    const res = await request(app)
      .delete('/api/expenses/clear-month')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);

    const stillThere = await request(app)
      .get('/api/expenses')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenA}`);
    expect(stillThere.body.length).toBe(1);
  });

  it('cannot read A\'s receipts or exports using A\'s id', async () => {
    const receipts = await request(app)
      .get('/api/expenses/receipts')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenB}`);
    expect(receipts.body).toEqual([]);

    const csv = await request(app)
      .get('/api/expenses/export/csv')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenB}`);
    expect(csv.text).not.toContain('A groceries');
  });

  it('cannot list, update, or delete A\'s subscription', async () => {
    const list = await request(app)
      .get('/api/subscriptions')
      .query({ userId: userIdA })
      .set('Authorization', `Bearer ${tokenB}`);
    expect(list.body).toEqual([]);

    const update = await request(app)
      .put(`/api/subscriptions/${subscriptionIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'Paused' });
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete(`/api/subscriptions/${subscriptionIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(del.status).toBe(404);
  });

  it('cannot create a subscription tagged as A', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ userId: userIdA, name: 'Spoofed', cost: 5, purchaseDate: '2026-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.userId).not.toBe(userIdA);
  });

  it('cannot access A\'s budget routes by putting A\'s id in the URL', async () => {
    const get = await request(app)
      .get(`/api/budgets/${userIdA}/2026-01`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(get.status).toBe(403);

    const post = await request(app)
      .post(`/api/budgets/${userIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ monthYear: '2026-02', totalMonthlyBudget: 1 });
    expect(post.status).toBe(403);

    const del = await request(app)
      .delete(`/api/budgets/${userIdA}/2026-01`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(del.status).toBe(403);
  });

  it('cannot run the AI assistant as A by putting A\'s id in the URL', async () => {
    const res = await request(app)
      .post(`/api/ai/${userIdA}/chat`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ question: 'What is my budget?' });
    expect(res.status).toBe(403);
  });

  it('cannot read or update A\'s user profile by putting A\'s id in the URL', async () => {
    const get = await request(app)
      .get(`/api/users/${userIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(get.status).toBe(403);

    const put = await request(app)
      .put(`/api/users/${userIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ firstName: 'Hacked' });
    expect(put.status).toBe(403);

    const del = await request(app)
      .delete(`/api/users/${userIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(del.status).toBe(403);
  });

  it('rejects malformed ids with 400 instead of a 500', async () => {
    const res = await request(app)
      .get('/api/budgets/not-a-valid-id/2026-01')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });

  it('rejects every one of these endpoints with 401 when unauthenticated', async () => {
    const calls = [
      request(app).get('/api/expenses').query({ userId: userIdA }),
      request(app).get('/api/subscriptions').query({ userId: userIdA }),
      request(app).get(`/api/budgets/${userIdA}/2026-01`),
      request(app).post(`/api/ai/${userIdA}/chat`).send({ question: 'hi' }),
      request(app).get(`/api/users/${userIdA}`)
    ];
    const results = await Promise.all(calls);
    for (const res of results) expect(res.status).toBe(401);
  });
});
