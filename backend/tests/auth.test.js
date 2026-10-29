import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/testDb.js';

// Google's real servers never get hit in tests — this fakes a verified token
// with a mutable payload (tests can override fields, e.g. email_verified) so
// googleLogin's own find-or-create logic can be tested.
const mockGooglePayload = {
  email: 'googleuser@test.com',
  email_verified: true,
  given_name: 'Google',
  family_name: 'User',
  sub: 'google-sub-123'
};
class MockOAuth2Client {
  verifyIdToken() {
    return Promise.resolve({
      getPayload: () => ({ ...mockGooglePayload })
    });
  }
}
vi.mock('google-auth-library', () => ({
  OAuth2Client: MockOAuth2Client
}));

// No real emails sent during tests — just confirm the controller calls this correctly.
vi.mock('../utils/mailer.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined)
}));

let app;
let User;

beforeAll(async () => {
  await setupTestDB();
  app = (await import('../app.js')).default;
  User = (await import('../models/User.js')).default;
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearTestDB();
  vi.clearAllMocks();
  mockGooglePayload.email = 'googleuser@test.com';
  mockGooglePayload.email_verified = true;
});

const validUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'testuser@test.com',
  password: 'Test1234'
};

describe('POST /api/users (register)', () => {
  it('rejects a weak password', async () => {
    const res = await request(app).post('/api/users').send({ ...validUser, password: 'weak' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/users').send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('registers a valid user and returns a token', async () => {
    const res = await request(app).post('/api/users').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.userId).toBeTruthy();
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/users').send(validUser);
    const res = await request(app).post('/api/users').send(validUser);
    expect(res.status).toBe(409);
  });

  it('rejects a password longer than 72 bytes (bcrypt silently ignores the rest)', async () => {
    const res = await request(app).post('/api/users').send({ ...validUser, password: `Aa1${'x'.repeat(70)}` });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/users/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/users').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: validUser.email,
      password: validUser.password
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects the wrong password', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: validUser.email,
      password: 'WrongPass1'
    });
    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent email with the exact same status and message as a wrong password', async () => {
    const wrongPassword = await request(app).post('/api/users/login').send({
      email: validUser.email,
      password: 'WrongPass1'
    });
    const unknownEmail = await request(app).post('/api/users/login').send({
      email: 'doesnotexist@test.com',
      password: 'WrongPass1'
    });
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('rejects a password-login attempt on a Google-only account with the same generic message, not a 500', async () => {
    await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });
    const res = await request(app).post('/api/users/login').send({
      email: 'googleuser@test.com',
      password: 'WrongPass1'
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('PUT /api/users/:userId/password — changePassword on a Google-only account', () => {
  it('returns 400, not a 500, when the account has no password set', async () => {
    const google = await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });
    const res = await request(app)
      .put(`/api/users/${google.body.userId}/password`)
      .set('Authorization', `Bearer ${google.body.token}`)
      .send({ currentPassword: 'anything', newPassword: 'NewPass1234' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/users/google-login', () => {
  it('creates a new account on first Google sign-in', async () => {
    const res = await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const user = await User.findOne({ email: 'googleuser@test.com' });
    expect(user).toBeTruthy();
    expect(user.authProvider).toBe('google');
  });

  it('logs in to the same account on a second Google sign-in', async () => {
    const first = await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });
    const second = await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });
    expect(second.body.userId).toBe(first.body.userId);
  });

  it('rejects a token whose email Google has not verified', async () => {
    mockGooglePayload.email_verified = false;
    const res = await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });
    expect(res.status).toBe(401);
    const user = await User.findOne({ email: mockGooglePayload.email });
    expect(user).toBeNull();
  });

  it('does not link an unverified Google email to an existing password account', async () => {
    mockGooglePayload.email = validUser.email;
    mockGooglePayload.email_verified = false;
    await request(app).post('/api/users').send(validUser);

    await request(app).post('/api/users/google-login').send({ idToken: 'fake-google-token' });

    const user = await User.findOne({ email: validUser.email });
    expect(user.googleId).toBeFalsy();
  });
});

describe('POST /api/users/forgot-password + reset-password', () => {
  it('responds the same generic message whether or not the email is registered', async () => {
    await request(app).post('/api/users').send(validUser);
    const known = await request(app).post('/api/users/forgot-password').send({ email: validUser.email });
    const unknown = await request(app).post('/api/users/forgot-password').send({ email: 'nobody@test.com' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
  });

  it('sets a hashed reset token on the user when registered', async () => {
    await request(app).post('/api/users').send(validUser);
    await request(app).post('/api/users/forgot-password').send({ email: validUser.email });
    const user = await User.findOne({ email: validUser.email }).select('+resetPasswordTokenHash +resetPasswordExpires');
    expect(user.resetPasswordTokenHash).toBeTruthy();
    expect(user.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
  });

  it('resets the password with a valid token and rejects the old password afterward', async () => {
    await request(app).post('/api/users').send(validUser);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.updateOne(
      { email: validUser.email },
      { resetPasswordTokenHash: tokenHash, resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) }
    );

    const resetRes = await request(app)
      .post('/api/users/reset-password')
      .send({ token: rawToken, newPassword: 'NewPass1234' });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/users/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/users/login')
      .send({ email: validUser.email, password: 'NewPass1234' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects an invalid/expired reset token', async () => {
    await request(app).post('/api/users').send(validUser);
    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'NewPass1234' });
    expect(res.status).toBe(400);
  });
});

describe('JWT hardening', () => {
  it('rejects a forged "alg: none" token with no signature', async () => {
    await request(app).post('/api/users').send(validUser);
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const user = await User.findOne({ email: validUser.email });
    const payload = Buffer.from(JSON.stringify({ userId: user._id.toString() })).toString('base64url');
    const forgedToken = `${header}.${payload}.`;

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${forgedToken}`);
    expect(res.status).toBe(401);
  });

  it('signs out existing sessions after a password change, but not before', async () => {
    const register = await request(app).post('/api/users').send(validUser);
    const oldToken = register.body.token;

    // Ensure the new token's iat (second-granularity) differs from the old one's.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await request(app)
      .put(`/api/users/${register.body.userId}/password`)
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: validUser.password, newPassword: 'NewPass1234' });

    const afterChange = await request(app)
      .get(`/api/users/${register.body.userId}`)
      .set('Authorization', `Bearer ${oldToken}`);
    expect(afterChange.status).toBe(401);

    const freshLogin = await request(app)
      .post('/api/users/login')
      .send({ email: validUser.email, password: 'NewPass1234' });
    const freshCheck = await request(app)
      .get(`/api/users/${register.body.userId}`)
      .set('Authorization', `Bearer ${freshLogin.body.token}`);
    expect(freshCheck.status).toBe(200);
  }, 10000);

  it('does not sign out a brand-new session that never changed its password', async () => {
    const register = await request(app).post('/api/users').send(validUser);
    const res = await request(app)
      .get(`/api/users/${register.body.userId}`)
      .set('Authorization', `Bearer ${register.body.token}`);
    expect(res.status).toBe(200);
  });
});

// Runs last on purpose — the login rate limiter's in-memory counter is shared
// across every test in this file (they all reuse the same app instance), so
// tripping it here can't affect the login assertions above.
describe('POST /api/users/login rate limiting', () => {
  it('rate-limits repeated login attempts', async () => {
    await request(app).post('/api/users').send(validUser);
    const attempts = Array.from({ length: 11 }, () =>
      request(app).post('/api/users/login')
        .set('X-Forwarded-For', '10.0.0.1')
        .send({ email: validUser.email, password: 'WrongPass1' })
    );
    const results = await Promise.all(attempts);
    expect(results.some((r) => r.status === 429)).toBe(true);
  }, 15000);

  it('gives two different X-Forwarded-For IPs separate buckets for the same email', async () => {
    await request(app).post('/api/users').send(validUser);

    const attemptsFromIpA = Array.from({ length: 10 }, () =>
      request(app).post('/api/users/login')
        .set('X-Forwarded-For', '10.0.0.2')
        .send({ email: validUser.email, password: 'WrongPass1' })
    );
    const resultsA = await Promise.all(attemptsFromIpA);
    expect(resultsA.every((r) => r.status === 401)).toBe(true);

    // A fresh IP guessing the same account must not already be throttled by IP A's attempts.
    const fromIpB = await request(app).post('/api/users/login')
      .set('X-Forwarded-For', '10.0.0.3')
      .send({ email: validUser.email, password: 'WrongPass1' });
    expect(fromIpB.status).toBe(401);
  }, 15000);
});
