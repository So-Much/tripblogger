#!/usr/bin/env node
const { generateKeyPairSync } = require('crypto');
const { writeFileSync, mkdirSync, chmodSync } = require('fs');
const { join } = require('path');

const dir = __dirname;
mkdirSync(dir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Bind-mounted into containers that run as a different uid ("app"), so 0600 would make it
// unreadable on Linux hosts. Dev-only key; production should mount a secret owned by the app user.
writeFileSync(join(dir, 'dev-private.pem'), privateKey, { mode: 0o644 });
chmodSync(join(dir, 'dev-private.pem'), 0o644);
writeFileSync(join(dir, 'dev-public.pem'), publicKey);
console.log('Wrote infra/jwt/dev-private.pem and infra/jwt/dev-public.pem');
