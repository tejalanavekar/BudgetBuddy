import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';
import Expense from '../models/Expense.js';
import Subscription from '../models/Subscription.js';
import Budget from '../models/Budget.js';
import User from '../models/User.js';
import * as langchainService from '../utils/langchainService.js';

const SECRET = 'SECRET-INTERNAL-DETAIL';

let app;
let token, userId;
const originalNodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
  await setupTestDB();
  process.env.NODE_ENV = 'production';
  app = (await import('../app.js')).default;
});

afterAll(async () => {
  process.env.NODE_ENV = originalNodeEnv;
  await teardownTestDB();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDB();
});

beforeEach(async () => {
  process.env.NODE_ENV = 'production';
  const res = await request(app).post('/api/users').send({
    firstName: 'Leak', lastName: 'Tester', email: 'leaktester@test.com', password: 'Test1234'
  });
  userId = res.body.userId;
  token = res.body.token;
});

describe('No controller ever leaks internal error details, even in production', () => {
  it('expense list failure', async () => {
    vi.spyOn(Expense, 'find').mockImplementation(() => { throw new Error(SECRET); });
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('subscription list failure', async () => {
    vi.spyOn(Subscription, 'find').mockImplementation(() => { throw new Error(SECRET); });
    const res = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('budget save failure', async () => {
    vi.spyOn(Budget.prototype, 'save').mockImplementation(() => { throw new Error(SECRET); });
    const res = await request(app)
      .post(`/api/budgets/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monthYear: '2026-01', totalMonthlyBudget: 500 });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('user registration failure', async () => {
    vi.spyOn(User.prototype, 'save').mockImplementation(() => { throw new Error(SECRET); });
    const res = await request(app).post('/api/users').send({
      firstName: 'New', lastName: 'User', email: 'newleaktester@test.com', password: 'Test1234'
    });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('AI chat failure', async () => {
    vi.spyOn(langchainService, 'runAssistant').mockRejectedValue(new Error(SECRET));
    const res = await request(app)
      .post(`/api/ai/${userId}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'What is my budget?' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('receipt scan failure (Google Vision)', async () => {
    const axios = (await import('axios')).default;
    vi.spyOn(axios, 'post').mockRejectedValue(new Error(SECRET));
    const res = await request(app)
      .post('/api/expenses/scan-receipt')
      .set('Authorization', `Bearer ${token}`)
      .attach('receipt', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]), 'receipt.jpg');
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });
});
