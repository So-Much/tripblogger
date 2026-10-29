#!/usr/bin/env node
/**
 * End-to-end check of the running compose stack through Traefik.
 *
 *   npm run e2e            (reads ADMIN_SECRET from .env.compose)
 *
 * Creates a throwaway member "e2e_<random>", a trip and a place; nothing else is touched.
 */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ADMIN = process.env.ADMIN_SECRET;
const tag = Date.now().toString(36);
let token = null;

async function call(method, path, { body, headers = {}, raw = false } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (data && typeof data === 'object' && 'data' in data && !('statusCode' in data)) data = data.data;
  return { status: res.status, headers: res.headers, data };
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const note = await fn();
    console.log(`ok   ${name} (${Date.now() - started}ms)${note ? ` — ${note}` : ''}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    throw err;
  }
}

async function eventually(fn, timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > until) return value;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function main() {
  assert.ok(ADMIN, 'ADMIN_SECRET missing — run with node --env-file=.env.compose');
  const ctx = {};

  await step('register member', async () => {
    const r = await call('POST', '/api/auth/register', {
      body: { username: `e2e_${tag}`, password: 'E2e-pass-123', confirmPassword: 'E2e-pass-123', deviceId: `e2e-${tag}` },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    token = r.data.accessToken;
  });

  await step('upload avatar to SeaweedFS and read it back via /uploads', async () => {
    // 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const form = new FormData();
    form.append('avatar', new Blob([png], { type: 'image/png' }), 'a.png');
    const r = await call('PATCH', '/api/users/me/profile', { body: form });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const avatarUrl = r.data.profile?.avatarUrl ?? r.data.avatarUrl;
    assert.ok(avatarUrl, `no avatarUrl in ${JSON.stringify(r.data).slice(0, 300)}`);
    const path = new URL(avatarUrl).pathname;
    assert.match(path, /^\/uploads\//);
    const img = await call('GET', path, { raw: true });
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('content-type'), 'image/png');
    const put = await call('PUT', path, { raw: true, body: 'x' });
    assert.notEqual(put.status, 200, 'anonymous PUT on /uploads must be rejected');
    return path;
  });

  await step('Idempotency-Key replays trip creation', async () => {
    const key = `e2e-${randomUUID()}`;
    const body = {
      title: `E2E ${tag}`,
      destinationLabel: 'Hà Nội',
      destinationLat: 21.0285,
      destinationLng: 105.8542,
      startDate: '2026-12-01',
      endDate: '2026-12-01',
    };
    const a = await call('POST', '/api/trips', { body, headers: { 'Idempotency-Key': key } });
    const b = await call('POST', '/api/trips', { body, headers: { 'Idempotency-Key': key } });
    const c = await call('POST', '/api/trips', { body: { ...body, title: 'other' }, headers: { 'Idempotency-Key': key } });
    assert.equal(a.status, 201, JSON.stringify(a.data));
    assert.equal(b.data.id, a.data.id);
    assert.equal(b.headers.get('idempotent-replayed'), 'true');
    assert.equal(c.status, 422);
    ctx.tripId = a.data.id;
  });

  await step('approved place reaches Trip through outbox + Redis stream', async () => {
    const created = await call('POST', '/api/places', {
      body: { name: `E2E Cafe ${tag}`, lat: 21.031, lng: 105.853, category: 'cafe' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const placeId = created.data.place.id;
    const approve = (id) =>
      call('POST', `/api/places/contributions/${id}/review`, {
        body: { decision: 'approved' },
        headers: { 'x-admin-secret': ADMIN },
      });
    assert.equal((await approve(created.data.contribution.id)).status, 201);

    const stop = await call('POST', `/api/trips/${ctx.tripId}/stops`, {
      body: {
        place: { id: placeId, name: `E2E Cafe ${tag}`, address: null, lat: 21.031, lng: 105.853, category: 'cafe', source: 'db' },
      },
    });
    assert.equal(stop.status, 201, JSON.stringify(stop.data));

    const renamed = `E2E Renamed ${tag}`;
    const suggestion = await call('POST', `/api/places/${placeId}/suggestions`, { body: { name: renamed } });
    assert.equal(suggestion.status, 201, JSON.stringify(suggestion.data));
    const contributionId = suggestion.data.contribution?.id ?? suggestion.data.id;
    assert.equal((await approve(contributionId)).status, 201);

    const synced = await eventually(async () => {
      const trip = await call('GET', `/api/trips/${ctx.tripId}`);
      return JSON.stringify(trip.data).includes(renamed);
    });
    assert.ok(synced, 'trip stop was not renamed by the place.updated event');
  });

  await step('reverse geocode (public Photon fallback + Redis cache)', async () => {
    const lat = (10.7769 + Math.random() / 1000).toFixed(6);
    const lng = (106.7009 + Math.random() / 1000).toFixed(6);
    const path = `/api/map/reverse?lat=${lat}&lng=${lng}`;
    let t0 = Date.now();
    let first = await call('GET', path, { headers: { 'Accept-Language': 'vi' } });
    if (first.status === 503) {
      t0 = Date.now();
      first = await call('GET', path, { headers: { 'Accept-Language': 'vi' } });
    }
    const firstMs = Date.now() - t0;
    // photon.komoot.io is a third-party free service; its outages must not fail our pipeline.
    if (first.status === 503 && first.data?.error === 'photon_unavailable') {
      return 'SKIPPED — public Photon unreachable';
    }
    const t1 = Date.now();
    const second = await call('GET', path, { headers: { 'Accept-Language': 'vi' } });
    const cachedMs = Date.now() - t1;
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.deepEqual(second.data, first.data);
    return `${first.data.name}; first ${firstMs}ms, cached ${cachedMs}ms`;
  });

  await step('/metrics is not exposed through the gateway', async () => {
    const r = await call('GET', '/metrics', { raw: true });
    assert.equal(r.status, 404);
  });
}

main().catch(() => {
  process.exitCode = 1;
});
