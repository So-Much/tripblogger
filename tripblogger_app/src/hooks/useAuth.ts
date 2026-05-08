import { useMutation, useQuery } from '@tanstack/react-query';
import { authService, LoginPayload, RegisterPayload } from '@/src/services/api/auth.service';
import { useAuthStore } from '@/src/store/auth.store';

export function useMeQuery() {
  const tokens = useAuthStore((s) => s.tokens);
  const setMe = useAuthStore((s) => s.setMe);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const me = await authService.me();
      setMe(me);
      return me;
    },
    enabled: Boolean(tokens?.accessToken),
  });
}

export function useLoginMutation() {
  const setTokens = useAuthStore((s) => s.setTokens);
  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (tokens) => setTokens(tokens),
  });
}

export function useRegisterMutation() {
  const setTokens = useAuthStore((s) => s.setTokens);
  return useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (tokens) => setTokens(tokens),
  });
}

export function useGoogleLoginMutation() {
  const setTokens = useAuthStore((s) => s.setTokens);
  return useMutation({
    mutationKey: ['auth', 'google'],
    mutationFn: (payload: { idToken: string; deviceId: string }) => authService.google(payload),
    onSuccess: (tokens) => setTokens(tokens),
  });
}
