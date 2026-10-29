import { assertNoPlaceholderSecrets } from './secrets';

describe('assertNoPlaceholderSecrets', () => {
  const keys = ['JWT_ACCESS_SECRET', 'ADMIN_SECRET'] as const;

  it('throws in production when a sample value is left in place', () => {
    expect(() =>
      assertNoPlaceholderSecrets(
        { NODE_ENV: 'production', JWT_ACCESS_SECRET: 'change_this_access_secret_123456', ADMIN_SECRET: 'x'.repeat(32) },
        keys,
      ),
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('allows generated values', () => {
    expect(() =>
      assertNoPlaceholderSecrets({ NODE_ENV: 'production', JWT_ACCESS_SECRET: 'q8Zk2', ADMIN_SECRET: 'a1b2' }, keys),
    ).not.toThrow();
  });

  it('is relaxed outside production or with the explicit opt-out', () => {
    const env = { JWT_ACCESS_SECRET: 'change_this', ADMIN_SECRET: 'change_this' };
    expect(() => assertNoPlaceholderSecrets({ ...env, NODE_ENV: 'development' }, keys)).not.toThrow();
    expect(() =>
      assertNoPlaceholderSecrets({ ...env, NODE_ENV: 'production', ALLOW_PLACEHOLDER_SECRETS: '1' }, keys),
    ).not.toThrow();
  });
});
