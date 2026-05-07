import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLoginMutation, useMeQuery } from '@/src/hooks/useAuth';
import { apiBaseUrl } from '@/src/services/api/client';
import { formatApiError } from '@/src/utils/format-api-error';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const meQuery = useMeQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const borderColor = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const accent = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'minhnhieu50@gmail.com',
      password: '12345678',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await loginMutation.mutateAsync(values);
      await meQuery.refetch();
      router.replace('/');
    } catch (error) {
      setSubmitError(formatApiError(error, 'Đăng nhập thất bại'));
    }
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ThemedView style={styles.page}>
          <Pressable style={styles.backRow} hitSlop={14} onPress={() => router.replace('/')}>
            <IconSymbol name="chevron.left" color={muted} size={22} />
            <ThemedText style={{ color: muted }} type="defaultSemiBold">
              Về trang chủ
            </ThemedText>
          </Pressable>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollInner}
          >
            <View style={[styles.card, { borderColor, backgroundColor: card }]}>
              <View style={[styles.logoRing, { borderColor: accent }]}>
                <IconSymbol name="paperplane.fill" color={accent} size={32} />
              </View>

              <ThemedText type="subtitle" style={styles.title}>
                Welcome back
              </ThemedText>
              <ThemedText style={{ color: muted }}>Đăng nhập để lưu hồ sơ và khám phá thêm deals.</ThemedText>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.field}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                      Email
                    </ThemedText>
                    <TextInput
                      accessibilityLabel="Email"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="your@email.com"
                      placeholderTextColor={muted}
                      style={[styles.input, { borderColor, color: textColor }]}
                      value={value}
                      onChangeText={onChange}
                    />
                    {error ? <ThemedText style={styles.error}>{error.message}</ThemedText> : null}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.field}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                      Password
                    </ThemedText>
                    <TextInput
                      accessibilityLabel="Password"
                      secureTextEntry
                      placeholder="••••••••"
                      placeholderTextColor={muted}
                      style={[styles.input, { borderColor, color: textColor }]}
                      value={value}
                      onChangeText={onChange}
                    />
                    {error ? <ThemedText style={styles.error}>{error.message}</ThemedText> : null}
                  </View>
                )}
              />

              {submitError ? <ThemedText style={styles.error}>{submitError}</ThemedText> : null}

              {__DEV__ ? (
                <ThemedText style={[styles.devHint, { color: muted }]} selectable>{`API: ${apiBaseUrl}`}</ThemedText>
              ) : null}

              <Pressable style={[styles.signInButton, { backgroundColor: cta }]} onPress={onSubmit}>
                <ThemedText type="defaultSemiBold" style={styles.signInText}>
                  {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
                </ThemedText>
              </Pressable>

              <Pressable onPress={() => router.replace('/')}>
                <ThemedText style={[styles.skip, { color: muted }]}>Tiếp tục không đăng nhập</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  logoRing: {
    alignSelf: 'flex-start',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    opacity: 0.95,
  },
  field: { gap: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  devHint: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    marginTop: 4,
    marginBottom: 2,
    opacity: 0.95,
  },
  signInButton: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 6,
    paddingVertical: 14,
  },
  signInText: { color: '#fff' },
  skip: {
    paddingVertical: 4,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    lineHeight: 18,
  },
});
