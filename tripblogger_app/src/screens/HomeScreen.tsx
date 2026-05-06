import { useMemo } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLoginMutation, useMeQuery } from '@/src/hooks/useAuth';
import { useAccessControl } from '@/src/hooks/useAccessControl';
import { useAuthStore } from '@/src/store/auth.store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

export function HomeScreen() {
  const loginMutation = useLoginMutation();
  const meQuery = useMeQuery();
  const { hasStatus, canPerformVerifiedAction } = useAccessControl();
  const logout = useAuthStore((s) => s.logout);
  const tokens = useAuthStore((s) => s.tokens);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const statusLine = useMemo(() => {
    if (!tokens) return 'Guest mode';
    if (meQuery.isLoading) return 'Loading profile...';
    if (meQuery.data) return `Role: ${meQuery.data.role} | Statuses: ${meQuery.data.statuses.join(', ')}`;
    return 'Authenticated';
  }, [tokens, meQuery.data, meQuery.isLoading]);

  const onSubmit = handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
    await meQuery.refetch();
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TripBlogger Foundation</Text>
      <Text>{statusLine}</Text>
      <Text>{hasStatus('PREMIUM') ? 'Premium enabled' : 'Premium not active'}</Text>
      <Text>{canPerformVerifiedAction() ? 'Verified actions allowed' : 'Verified actions blocked'}</Text>

      {!tokens ? (
        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Password"
                secureTextEntry
                style={styles.input}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Button title={loginMutation.isPending ? 'Signing in...' : 'Sign in'} onPress={onSubmit} />
        </View>
      ) : (
        <View style={styles.form}>
          <Button title="Refresh profile" onPress={() => meQuery.refetch()} />
          <Button title="Logout" onPress={logout} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  form: { gap: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
});
