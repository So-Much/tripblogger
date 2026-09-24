export type AccessTokenPayload = {
  sub: string;
  role: string;
  statuses: string[];
  iss?: string;
  kid?: string;
};

export type Jwk = {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
};

export type Jwks = { keys: Jwk[] };
