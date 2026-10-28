// One user walking the main read paths through Traefik. Fails fast if any route is broken.
import { guestToken, journey } from './lib.js';

export const options = {
  vus: 1,
  iterations: 3,
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup() {
  return { token: guestToken() };
}

export default function ({ token }) {
  journey(token);
}
