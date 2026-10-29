import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

// Cloudinary is never hit for real in tests — a fake receipt buffer isn't a real
// decodable image, so a real upload call would fail for reasons unrelated to what
// this file is actually testing (request validation).
vi.mock('../utils/cloudinaryService.js', () => ({
  uploadBuffer: vi.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/fake/image/upload/fake.png', publicId: 'budgetbuddy/fake' }),
  deleteByPublicId: vi.fn().mockResolvedValue(undefined)
}));

let app;
let token, userId;

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
    firstName: 'Val', lastName: 'Tester', email: 'valtester@test.com', password: 'Test1234'
  });
  userId = res.body.userId;
  token = res.body.token;
});

describe('expenseCreateSchema (POST /api/expenses)', () => {
  it('accepts a valid expense', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Groceries')
      .field('amount', '42.50')
      .field('category', 'Food')
      .field('date', '2026-07-01')
      .field('items', JSON.stringify([{ name: 'Milk', price: 3.5 }]));
    expect(res.status).toBe(201);
  });

  it('rejects an unknown category', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Groceries')
      .field('amount', '42.50')
      .field('category', 'NotARealCategory')
      .field('date', '2026-07-01');
    expect(res.status).toBe(400);
  });

  it('rejects a malformed date', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Groceries')
      .field('amount', '42.50')
      .field('category', 'Food')
      .field('date', '07/01/2026');
    expect(res.status).toBe(400);
  });

  it('rejects more than 100 items', async () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ name: `Item ${i}`, price: 1 }));
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Bulk order')
      .field('amount', '500')
      .field('category', 'Shopping')
      .field('date', '2026-07-01')
      .field('items', JSON.stringify(items));
    expect(res.status).toBe(400);
  });

  it('rejects an object sent where amount should be a number string', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Groceries')
      .field('category', 'Food')
      .field('date', '2026-07-01');
    // amount omitted entirely — required field missing
    expect(res.status).toBe(400);
  });
});

describe('expenseUpdateSchema (PUT /api/expenses/:id)', () => {
  let expenseId;
  beforeEach(async () => {
    const create = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Original')
      .field('amount', '10')
      .field('category', 'Food')
      .field('date', '2026-07-01');
    expenseId = create.body.expense._id;
  });

  it('accepts a valid partial update', async () => {
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .field('amount', '99.99');
    expect(res.status).toBe(200);
  });

  it('rejects a negative amount', async () => {
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .field('amount', '-5');
    expect(res.status).toBe(400);
  });
});

describe('aiChatSchema (POST /api/ai/:userId/chat)', () => {
  it('rejects an empty question', async () => {
    const res = await request(app)
      .post(`/api/ai/${userId}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects a question over 2000 characters', async () => {
    const res = await request(app)
      .post(`/api/ai/${userId}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
  });

  it('rejects more than 20 history entries', async () => {
    const history = Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' }));
    const res = await request(app)
      .post(`/api/ai/${userId}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'What is my budget?', history });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown page value', async () => {
    const res = await request(app)
      .post(`/api/ai/${userId}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'What is my budget?', page: '<script>alert(1)</script>' });
    expect(res.status).toBe(400);
  });
});

describe('profileUpdateSchema (PUT /api/users/:userId)', () => {
  it('accepts a valid partial profile update', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Updated', phone: '555-123-4567' });
    expect(res.status).toBe(200);
  });

  it('rejects an unknown key, e.g. a NoSQL-injection style value', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown preferences key', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ preferences: { notARealPreference: true } });
    expect(res.status).toBe(400);
  });
});

describe('budgetSchema categoryBudgets cap (POST /api/budgets/:userId)', () => {
  it('accepts a valid budget with category budgets', async () => {
    const res = await request(app)
      .post(`/api/budgets/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monthYear: '2026-01', totalMonthlyBudget: 500, categoryBudgets: [{ category: 'Food', amount: 100 }] });
    expect(res.status).toBe(200);
  });

  it('rejects more than 50 category budgets', async () => {
    const categoryBudgets = Array.from({ length: 51 }, (_, i) => ({ category: `Cat${i}`, amount: 10 }));
    const res = await request(app)
      .post(`/api/budgets/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monthYear: '2026-01', totalMonthlyBudget: 500, categoryBudgets });
    expect(res.status).toBe(400);
  });
});

describe(':monthYear URL param format check (budget routes)', () => {
  it('accepts a well-formed monthYear', async () => {
    const res = await request(app)
      .get(`/api/budgets/${userId}/2026-01`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('rejects a malformed monthYear', async () => {
    const res = await request(app)
      .get(`/api/budgets/${userId}/not-a-month`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('subscriptionCreateSchema / subscriptionUpdateSchema', () => {
  it('accepts a valid subscription', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', cost: 15.99, billingCycle: 'Monthly', category: 'Streaming', purchaseDate: '2026-01-01' });
    expect(res.status).toBe(201);
  });

  it('rejects an unknown billingCycle', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', cost: 15.99, billingCycle: 'Weekly', purchaseDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown category', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', cost: 15.99, category: 'NotARealCategory', purchaseDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('rejects a cost over the upper bound', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', cost: 999999999, purchaseDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid partial update', async () => {
    const create = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', cost: 15.99, purchaseDate: '2026-01-01' });
    const res = await request(app)
      .put(`/api/subscriptions/${create.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Paused' });
    expect(res.status).toBe(200);
  });

  it('rejects an unknown status on update', async () => {
    const create = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', cost: 15.99, purchaseDate: '2026-01-01' });
    const res = await request(app)
      .put(`/api/subscriptions/${create.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SuperActive' });
    expect(res.status).toBe(400);
  });
});

describe('upload file-type restrictions', () => {
  it('accepts a valid JPEG receipt', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Groceries')
      .field('amount', '10')
      .field('category', 'Food')
      .field('date', '2026-07-01')
      .attach('receipt', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]), { filename: 'receipt.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
  });

  it('rejects an SVG upload', async () => {
    const svg = Buffer.from('<svg onload="alert(1)"></svg>');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('description', 'Groceries')
      .field('amount', '10')
      .field('category', 'Food')
      .field('date', '2026-07-01')
      .attach('receipt', svg, { filename: 'receipt.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
  });
});
