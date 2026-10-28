import http from 'k6/http';
import { check } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://traefik:3000';

/** Guest token from Core; Geo/Trip validate it through Core's JWKS. */
export function guestToken() {
  const id = `k6-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const res = http.post(`${BASE}/api/auth/guest`, JSON.stringify({ sessionId: id, deviceId: id }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'guest login 2xx': (r) => r.status >= 200 && r.status < 300 });
  const body = res.json();
  const token = body.accessToken || (body.data && body.data.accessToken);
  if (!token) throw new Error(`No accessToken in guest response: ${res.body}`);
  return token;
}

export function auth(token) {
  return { headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'vi' } };
}

const HANOI = { lat: 21.0285, lng: 105.8542 };

export function journey(token) {
  const opts = auth(token);
  const results = [
    http.get(`${BASE}/api/health`, { tags: { name: 'core health' } }),
    http.get(`${BASE}/api/map/categories`, { tags: { name: 'geo categories' } }),
    http.get(`${BASE}/api/map/search?q=pho&lat=${HANOI.lat}&lng=${HANOI.lng}&limit=10`, {
      ...opts,
      tags: { name: 'geo search' },
    }),
    http.get(`${BASE}/api/map/nearby?lat=${HANOI.lat}&lng=${HANOI.lng}&category=restaurant&radius=1500`, {
      ...opts,
      tags: { name: 'geo nearby' },
    }),
    http.get(`${BASE}/api/map/reverse?lat=${HANOI.lat}&lng=${HANOI.lng}`, { ...opts, tags: { name: 'geo reverse' } }),
    http.get(`${BASE}/api/trips`, { ...opts, tags: { name: 'trip list' } }),
  ];
  for (const r of results) {
    check(r, { [`${r.request.method} ${r.url.replace(BASE, '').split('?')[0]} ok`]: (x) => x.status < 400 });
  }
}
