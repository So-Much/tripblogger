const test = require('node:test');
const assert = require('node:assert/strict');
const { fillSecrets } = require('./secrets-init');

const gens = { JWT_ACCESS_SECRET: () => 'NEW_JWT', S3_SECRET_KEY: () => 'NEW_S3' };

test('replaces sample values and keeps real ones', () => {
  const input = 'JWT_ACCESS_SECRET=change_this_access_secret_123456\nS3_SECRET_KEY=kept-real-value\n';
  const { text, changed } = fillSecrets(input, gens, {});
  assert.equal(text, 'JWT_ACCESS_SECRET=NEW_JWT\nS3_SECRET_KEY=kept-real-value\n');
  assert.deepEqual(changed, ['JWT_ACCESS_SECRET']);
});

test('appends missing keys and defaults', () => {
  const { text, changed } = fillSecrets('COMPOSE_PROJECT_NAME=tripblogger\n', gens, { S3_ACCESS_KEY: 'tripblogger' });
  assert.equal(
    text,
    'COMPOSE_PROJECT_NAME=tripblogger\nJWT_ACCESS_SECRET=NEW_JWT\nS3_SECRET_KEY=NEW_S3\nS3_ACCESS_KEY=tripblogger\n',
  );
  assert.deepEqual(changed, ['JWT_ACCESS_SECRET', 'S3_SECRET_KEY', 'S3_ACCESS_KEY']);
});

test('fills empty values but never rewrites the SA password', () => {
  const input = 'MSSQL_SA_PASSWORD=YourStrong!Passw0rd\r\nJWT_ACCESS_SECRET=\r\n';
  const { text, warnings } = fillSecrets(input, gens, {});
  assert.match(text, /^MSSQL_SA_PASSWORD=YourStrong!Passw0rd\nJWT_ACCESS_SECRET=NEW_JWT\n/);
  assert.equal(warnings.length, 1);
});

test('is idempotent once secrets are real', () => {
  const first = fillSecrets('', gens, {}).text;
  const second = fillSecrets(first, gens, {});
  assert.equal(second.text, first);
  assert.deepEqual(second.changed, []);
});

test('real-looking random values pass the services placeholder guard', () => {
  const { text } = fillSecrets('');
  for (const line of text.trim().split('\n')) {
    const value = line.split('=')[1];
    assert.doesNotMatch(value, /change_this|change_me|your_/i, line);
  }
});
