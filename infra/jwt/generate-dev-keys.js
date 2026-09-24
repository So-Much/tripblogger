#!/usr/bin/env node
const { generateKeyPairSync } = require('crypto');
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const dir = __dirname;
mkdirSync(dir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

writeFileSync(join(dir, 'dev-private.pem'), privateKey, { mode: 0o600 });
writeFileSync(join(dir, 'dev-public.pem'), publicKey);
console.log('Wrote infra/jwt/dev-private.pem and infra/jwt/dev-public.pem');
