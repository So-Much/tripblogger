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
import { useMeQuery, useRegisterMutation } from '@/src/hooks/useAuth';
import { formatApiError } from '@/src/utils/format-api-error';
import { useI18n } from '@/src/i18n';

const registerSchema = z
  .object({
    username: z.string().min(3, 'Username tối thiểu 3 ký tự'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const registerMutation = useRegisterMutation();
  const meQuery = useMeQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const borderColor = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const accent = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');

  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerMutation.mutateAsync(values);
      await meQuery.refetch();
      router.replace('/');
    } catch (error) {
      setSubmitError(formatApiError(error, 'Đăng ký thất bại'));
    }
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ThemedView style={styles.page}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollInner}>
            <View style={[styles.card, { borderColor, backgroundColor: card }]}>
              <View style={[styles.logoRing, { borderColor: accent }]}>
                <IconSymbol name="person.crop.circle.fill" color={accent} size={30} />
              </View>
              <ThemedText type="subtitle" style={styles.title}>
                {t('registerTitle')}
              </ThemedText>
              <ThemedText style={{ color: muted }}>{t('registerHint')}</ThemedText>

              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.field}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                      {t('username')}
                    </ThemedText>
                    <TextInput
                      accessibilityLabel="Username"
                      autoCapitalize="none"
                      placeholder="your_username"
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
                      {t('password')}
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

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.field}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                      {t('confirmPassword')}
                    </ThemedText>
                    <TextInput
                      accessibilityLabel="Confirm password"
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

              <Pressable style={[styles.signUpButton, { backgroundColor: cta }]} onPress={onSubmit}>
                <ThemedText type="defaultSemiBold" style={styles.signUpText}>
                  {registerMutation.isPending ? 'Creating account…' : 'Create account'}
                </ThemedText>
              </Pressable>

              <Pressable onPress={() => router.push('/login')}>
                <ThemedText style={[styles.switchText, { color: muted }]}>Đã có tài khoản? Đăng nhập</ThemedText>
              </Pressable>
              <Pressable
                style={styles.homeLinkRow}
                hitSlop={12}
                onPress={() => router.replace('/')}
                accessibilityRole="button"
                accessibilityLabel={t('backHome')}
              >
                <IconSymbol name="house.fill" color={muted} size={14} />
                <ThemedText style={{ color: muted }} type="defaultSemiBold">
                  {t('backHome')}
                </ThemedText>
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
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 22,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
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
    marginTop: 6,
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
  signUpButton: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 6,
    paddingVertical: 14,
  },
  signUpText: { color: '#fff' },
  switchText: {
    paddingVertical: 4,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  homeLinkRow: {
    marginTop: 4,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    lineHeight: 18,
  },
});
