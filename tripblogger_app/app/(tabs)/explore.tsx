import { Redirect } from 'expo-router';
import { ProfileScreen } from '@/src/screens/ProfileScreen';
import { useAuthStore } from '@/src/store/auth.store';

export default function ProfileTabRoute() {
  const hasAuth = Boolean(useAuthStore((s) => s.tokens?.accessToken));
  if (!hasAuth) return <Redirect href="/" />;
  return <ProfileScreen />;
}
