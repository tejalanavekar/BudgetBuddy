import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

// Cloudinary is never hit for real in tests — just track what deleteAccount asks it to delete.
const deleteByPublicId = vi.fn().mockResolvedValue(undefined);
vi.mock('../utils/cloudinaryService.js', () => ({
  uploadBuffer: vi.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/fake/image/upload/fake.png', publicId: 'budgetbuddy/fake' }),
  deleteByPublicId: (...args) => deleteByPublicId(...args)
}));

let app, User, Expense;
let token, userId;

beforeAll(async () => {
  await setupTestDB();
  app = (await import('../app.js')).default;
  User = (await import('../models/User.js')).default;
  Expense = (await import('../models/Expense.js')).default;
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  deleteByPublicId.mockClear();
  await clearTestDB();
});

beforeEach(async () => {
  const res = await request(app).post('/api/users').send({
    firstName: 'Delete', lastName: 'Tester', email: 'deletetester@test.com', password: 'Test1234'
  });
  userId = res.body.userId;
  token = res.body.token;
});

describe('DELETE /api/users/:userId — Cloudinary cleanup', () => {
  it('deletes the profile photo and every receipt from Cloudinary before deleting the account', async () => {
    await User.findByIdAndUpdate(userId, { photoPublicId: 'budgetbuddy/profile-photos/abc123' });
    await Expense.create([
      { userId, description: 'A', amount: 1, category: 'Food', date: '2026-01-01', receiptPublicId: 'budgetbuddy/receipts/r1' },
      { userId, description: 'B', amount: 2, category: 'Food', date: '2026-01-02', receiptPublicId: 'budgetbuddy/receipts/r2' },
      { userId, description: 'C', amount: 3, category: 'Food', date: '2026-01-03' } // no receipt — must not call deleteByPublicId(undefined)
    ]);

    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const deletedIds = deleteByPublicId.mock.calls.map(call => call[0]);
    expect(deletedIds).toContain('budgetbuddy/profile-photos/abc123');
    expect(deletedIds).toContain('budgetbuddy/receipts/r1');
    expect(deletedIds).toContain('budgetbuddy/receipts/r2');
    expect(deletedIds).not.toContain(undefined);

    expect(await User.findById(userId)).toBeNull();
    expect(await Expense.find({ userId })).toHaveLength(0);
  });

  it('still deletes the account even if a Cloudinary deletion fails', async () => {
    deleteByPublicId.mockRejectedValueOnce(new Error('cloudinary down'));
    await User.findByIdAndUpdate(userId, { photoPublicId: 'budgetbuddy/profile-photos/will-fail' });

    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await User.findById(userId)).toBeNull();
  });

  it('does not call Cloudinary at all when the user has no photo or receipts', async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(deleteByPublicId).not.toHaveBeenCalled();
  });
});
