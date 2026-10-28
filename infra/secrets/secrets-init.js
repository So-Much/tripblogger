#!/usr/bin/env node
/**
 * Fills .env.compose with random secrets, replacing only missing or sample values.
 * Real values already in the file are never touched, so it is safe to re-run.
 *
 *   npm run secrets:init
 */
const { randomBytes } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync, copyFileSync } = require('node:fs');
const { join } = require('node:path');

const PLACEHOLDER = /change_this|change_me|your_|^xyz$|^secret$|^$/i;

/** Keys generated when missing or still a sample value. */
const GENERATED = {
  JWT_ACCESS_SECRET: () => token(48),
  JWT_REFRESH_SECRET: () => token(48),
  ADMIN_SECRET: () => token(32),
  GEO_INTERNAL_TOKEN: () => token(32),
  TYPESENSE_API_KEY: () => token(32),
  S3_SECRET_KEY: () => token(32),
  GRAFANA_ADMIN_PASSWORD: () => token(18),
};

/** Keys that only need a value, not a secret one. */
const DEFAULTS = {
  S3_ACCESS_KEY: 'tripblogger',
  TYPESENSE_HOST: '',
  PHOTON_URL: '',
  PHOTON_FALLBACK_URL: 'https://photon.komoot.io',
  OTEL_EXPORTER_OTLP_ENDPOINT: '',
};

function token(bytes) {
  return randomBytes(bytes).toString('base64url');
}

/**
 * @param {string} text current .env.compose content
 * @param {Record<string, () => string>} generators
 * @returns {{ text: string, changed: string[], warnings: string[] }}
 */
function fillSecrets(text, generators = GENERATED, defaults = DEFAULTS) {
  const lines = text.split(/\r?\n/);
  const seen = new Set();
  const changed = [];
  const warnings = [];

  const out = lines.map((line) => {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!m) return line;
    const [, key, value] = m;
    seen.add(key);
    if (generators[key] && PLACEHOLDER.test(value.trim())) {
      changed.push(key);
      return `${key}=${generators[key]()}`;
    }
    return line;
  });

  if (out.length && out[out.length - 1] === '') out.pop();
  for (const [key, gen] of Object.entries(generators)) {
    if (!seen.has(key)) {
      out.push(`${key}=${gen()}`);
      changed.push(key);
    }
  }
  for (const [key, value] of Object.entries(defaults)) {
    if (!seen.has(key)) {
      out.push(`${key}=${value}`);
      changed.push(key);
    }
  }

  const sa = lines.map((l) => /^MSSQL_SA_PASSWORD=(.*)$/.exec(l)).find(Boolean);
  if (!sa || sa[1] === 'YourStrong!Passw0rd') {
    warnings.push(
      'MSSQL_SA_PASSWORD is still the sample value. It is not rotated automatically because the existing ' +
        'mssql_data volume keeps the old password; see docs/runbooks/secrets.md to change it.',
    );
  }

  return { text: `${out.join('\n')}\n`, changed, warnings };
}

function main() {
  const root = join(__dirname, '..', '..');
  const target = join(root, '.env.compose');
  const example = join(root, '.env.compose.example');
  if (!existsSync(target)) {
    copyFileSync(example, target);
    console.log('Created .env.compose from .env.compose.example');
  }
  const { text, changed, warnings } = fillSecrets(readFileSync(target, 'utf8'));
  writeFileSync(target, text);
  console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'Nothing to update; all secrets already set.');
  if (changed.some((k) => k.startsWith('JWT_'))) {
    console.log('JWT secrets changed: existing sessions will need to sign in again.');
  }
  for (const w of warnings) console.warn(`WARN: ${w}`);
  console.log('Recreate containers to apply: docker compose --env-file .env.compose --profile infra --profile apps up -d');
}

module.exports = { fillSecrets, PLACEHOLDER };

if (require.main === module) main();
