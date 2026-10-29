import { describe, it, expect } from 'vitest';
import { validateEnv, REQUIRED_ENV_VARS } from '../utils/validateEnv.js';

const validEnv = () => ({
  ATLAS_URI: 'mongodb://localhost/test',
  JWT_SECRET: 'a'.repeat(32),
  GOOGLE_CLIENT_ID: 'client-id',
  EMAIL_USER: 'user@test.com',
  EMAIL_APP_PASSWORD: 'app-password',
  FRONTEND_URL: 'https://example.com',
  GOOGLE_VISION_API_KEY: 'vision-key',
  GROQ_API_KEY: 'groq-key',
  CLOUDINARY_CLOUD_NAME: 'cloud-name',
  CLOUDINARY_API_KEY: 'cloud-key',
  CLOUDINARY_API_SECRET: 'cloud-secret'
});

describe('validateEnv', () => {
  it('returns no errors when every required var is set and JWT_SECRET is long enough', () => {
    expect(validateEnv(validEnv())).toEqual([]);
  });

  it('reports every missing required variable', () => {
    const env = validEnv();
    delete env.ATLAS_URI;
    delete env.GROQ_API_KEY;

    const errors = validateEnv(env);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('ATLAS_URI');
    expect(errors[0]).toContain('GROQ_API_KEY');
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    const env = { ...validEnv(), JWT_SECRET: 'a'.repeat(31) };
    const errors = validateEnv(env);
    expect(errors.some((e) => e.includes('JWT_SECRET'))).toBe(true);
  });

  it('accepts a JWT_SECRET exactly 32 characters long', () => {
    const env = { ...validEnv(), JWT_SECRET: 'a'.repeat(32) };
    expect(validateEnv(env)).toEqual([]);
  });

  it('does not double-report a missing JWT_SECRET as also "too short"', () => {
    const env = validEnv();
    delete env.JWT_SECRET;
    const errors = validateEnv(env);
    expect(errors.filter((e) => e.toLowerCase().includes('jwt_secret')).length).toBe(1);
  });

  it('every real required var is covered by the exported list', () => {
    expect(REQUIRED_ENV_VARS).toContain('JWT_SECRET');
    expect(REQUIRED_ENV_VARS.length).toBeGreaterThan(5);
  });
});
