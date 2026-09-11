import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import API from './axiosInstance';

// axios doesn't expose a public way to invoke an already-registered interceptor
// directly — accessing interceptors.<type>.handlers[0] is how axios itself stores
// them internally (confirmed by reading InterceptorManager.js), and is the only
// way to test these exact functions without making a real network call.
const requestInterceptor = API.interceptors.request.handlers[0].fulfilled;
const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // jsdom doesn't implement real navigation — assigning window.location.href
  // throws "Not implemented" unless location is replaced with a plain stub first.
  vi.stubGlobal('location', { href: '' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('axiosInstance — request interceptor', () => {
  it('attaches the Bearer token from localStorage', () => {
    localStorage.setItem('bt_token', 'stored-in-local');
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer stored-in-local');
  });

  it('falls back to the sessionStorage token when localStorage has none', () => {
    sessionStorage.setItem('bt_token', 'stored-in-session');
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer stored-in-session');
  });

  it('sends no Authorization header when there is no token anywhere', () => {
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('sets Content-Type: application/json for a plain object body', () => {
    const config = requestInterceptor({ headers: {}, data: { foo: 'bar' } });
    expect(config.headers['Content-Type']).toBe('application/json');
  });

  it('does NOT force Content-Type when the body is FormData (so file uploads keep their own boundary header)', () => {
    const config = requestInterceptor({ headers: {}, data: new FormData() });
    expect(config.headers['Content-Type']).toBeUndefined();
  });
});

describe('axiosInstance — response interceptor (401 handling)', () => {
  const make401 = (url) => ({
    response: { status: 401, data: { message: 'Unauthorized' } },
    config: { url }
  });

  it('force-logs-out and redirects to /signin on a 401 from a protected route', async () => {
    localStorage.setItem('bt_token', 'some-token');
    localStorage.setItem('bt_user', '{"userId":"1"}');

    await expect(responseErrorInterceptor(make401('/api/budgets/123/all'))).rejects.toBeDefined();

    expect(localStorage.getItem('bt_token')).toBeNull();
    expect(localStorage.getItem('bt_user')).toBeNull();
    expect(window.location.href).toBe('/signin');
  });

  it('does NOT force-logout on a 401 from the login endpoint itself (that just means wrong password)', async () => {
    localStorage.setItem('bt_token', 'some-token');

    await expect(responseErrorInterceptor(make401('/api/users/login'))).rejects.toBeDefined();

    expect(localStorage.getItem('bt_token')).toBe('some-token'); // untouched
    expect(window.location.href).toBe(''); // no redirect happened
  });

  it('does not touch storage or redirect for a non-401 error (e.g. a 500)', async () => {
    localStorage.setItem('bt_token', 'some-token');
    const error = { response: { status: 500, data: {} }, config: { url: '/api/expenses' } };

    await expect(responseErrorInterceptor(error)).rejects.toBeDefined();

    expect(localStorage.getItem('bt_token')).toBe('some-token');
    expect(window.location.href).toBe('');
  });
});
