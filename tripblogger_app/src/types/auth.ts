export type RoleCode = 'GUEST' | 'MEMBER' | 'ADMIN';

export type UserStatusCode =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING_VERIFICATION'
  | 'SUSPENDED'
  | 'DELETED'
  | 'BANNED'
  | 'PREMIUM'
  | 'VERIFIED';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  role: RoleCode;
  statuses: UserStatusCode[];
  profile: {
    username: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}
