// src/server/admin.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAuthorized } from './admin';

describe('isAuthorized', () => {
  beforeEach(() => vi.stubEnv('ADMIN_SECRET', 's3cret'));
  afterEach(() => vi.unstubAllEnvs());

  it('accepts the correct secret', () => {
    expect(isAuthorized('s3cret')).toBe(true);
  });
  it('rejects a wrong secret', () => {
    expect(isAuthorized('nope')).toBe(false);
  });
  it('rejects a wrong-length secret', () => {
    expect(isAuthorized('s3cre')).toBe(false);
  });
  it('rejects undefined', () => {
    expect(isAuthorized(undefined)).toBe(false);
  });
  it('rejects everything when ADMIN_SECRET is unset', () => {
    vi.stubEnv('ADMIN_SECRET', '');
    expect(isAuthorized('anything')).toBe(false);
  });
});
