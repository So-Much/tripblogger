// Ramp to 20 users. Geo/Trip throttle per client IP (THROTTLE_LIMIT, default 300/min) and k6 is one IP,
// so raise THROTTLE_LIMIT in .env.compose before a real load run or 429s will show up as failures.
import { sleep } from 'k6';
import { journey, memberToken } from './lib.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:geo search}': ['p(95)<800'],
    'http_req_duration{name:trip list}': ['p(95)<500'],
  },
};

export function setup() {
  return { token: memberToken() };
}

export default function ({ token }) {
  journey(token);
  sleep(1);
}
