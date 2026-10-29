const PLACEHOLDER = /change_this|change_me|your_|^xyz$|^secret$/i;

/**
 * Production must not boot with the sample secrets from the repo.
 * Run `npm run secrets:init` to generate real ones into `.env.compose`.
 */
export function assertNoPlaceholderSecrets(
  env: Record<string, unknown>,
  keys: readonly string[],
): void {
  if (env.NODE_ENV !== 'production' || env.ALLOW_PLACEHOLDER_SECRETS === '1') return;
  const bad = keys.filter((k) => {
    const v = env[k];
    return typeof v === 'string' && PLACEHOLDER.test(v);
  });
  if (bad.length) {
    throw new Error(
      `Refusing to start with placeholder secrets: ${bad.join(', ')}. Run \`npm run secrets:init\` or set ALLOW_PLACEHOLDER_SECRETS=1 for a throwaway setup.`,
    );
  }
}
