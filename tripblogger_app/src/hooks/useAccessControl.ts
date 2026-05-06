import { RoleCode, UserStatusCode } from '@/src/types/auth';
import { useAuthStore } from '@/src/store/auth.store';

export function useAccessControl() {
  const me = useAuthStore((s) => s.me);

  const hasRole = (role: RoleCode) => me?.role === role;
  const hasStatus = (status: UserStatusCode) => Boolean(me?.statuses.includes(status));
  const canAccessPremium = () => hasStatus('PREMIUM') || hasRole('MEMBER');
  const canPerformVerifiedAction = () => hasStatus('VERIFIED') && !hasStatus('BANNED');

  return { me, hasRole, hasStatus, canAccessPremium, canPerformVerifiedAction };
}
