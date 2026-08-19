import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionPulse } from '@/src/components/feedback/ActionPulse';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { PasswordField } from '@/src/components/forms/PasswordField';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useGoogleLoginMutation, useLoginMutation, useMeQuery } from '@/src/hooks/useAuth';
import { apiBaseUrl } from '@/src/services/api/client';
import { signInWithGoogleIdToken } from '@/src/services/auth/google-auth';
import { formatApiError } from '@/src/utils/format-api-error';
import { useI18n } from '@/src/i18n';
import { clearSessionQueryCache } from '@/src/services/session/session-bootstrap.service';
import { ensureDeviceId, persistAuthTokens } from '@/src/services/session/session.service';
import { DEV_TEST_ACCOUNT } from '@/src/constants/dev-test-account';

type LoginForm = {
  username: string;
  password: string;
};

export function LoginScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const meQuery = useMeQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successPulse, setSuccessPulse] = useState(0);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borderColor = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const accent = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');
  const onCta = useThemeColor({}, 'onCta');

  const loginSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(3, t('authUsernameMin')),
        password: z.string().min(8, t('authPasswordMin')),
      }),
    [t],
  );

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: __DEV__ ? DEV_TEST_ACCOUNT.username : '',
      password: __DEV__ ? DEV_TEST_ACCOUNT.password : '',
    },
  });

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const deviceId = await ensureDeviceId();
      clearSessionQueryCache();
      const tokens = await loginMutation.mutateAsync({ ...values, deviceId });
      await persistAuthTokens(tokens);
      await meQuery.refetch();
      setSuccessPulse((k) => k + 1);
      navTimerRef.current = setTimeout(() => router.replace('/'), 200);
    } catch (error) {
      setSubmitError(formatApiError(error, t('loginFailed')));
    }
  });

  const onGoogle = async () => {
    setSubmitError(null);
    try {
      const idToken = await signInWithGoogleIdToken();
      const deviceId = await ensureDeviceId();
      clearSessionQueryCache();
      const tokens = await googleLoginMutation.mutateAsync({ idToken, deviceId });
      await persistAuthTokens(tokens);
      await meQuery.refetch();
      setSuccessPulse((k) => k + 1);
      navTimerRef.current = setTimeout(() => router.replace('/'), 200);
    } catch (error) {
      setSubmitError(formatApiError(error, t('googleSignInFailed')));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ThemedView style={styles.page}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollInner}
          >
            <View style={[styles.card, { borderColor, backgroundColor: card }]}>
              <View style={[styles.logoRing, { borderColor: accent }]}>
                <IconSymbol name="paperplane.fill" color={accent} size={32} />
              </View>

              <ThemedText type="subtitle" style={styles.title}>
                {t('loginTitle')}
              </ThemedText>
              <ThemedText style={{ color: muted }}>{t('loginHint')}</ThemedText>

              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.field}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                      {t('username')}
                    </ThemedText>
                    <ThemedTextInput
                      accessibilityLabel="Username"
                      autoCapitalize="none"
                      placeholder="your_username"
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
                    <PasswordField value={value} onChangeText={onChange} accessibilityLabel="Password" />
                    {error ? <ThemedText style={styles.error}>{error.message}</ThemedText> : null}
                  </View>
                )}
              />

              {submitError ? <ThemedText style={styles.error}>{submitError}</ThemedText> : null}

              {__DEV__ ? (
                <View style={styles.devHints}>
                  <ThemedText style={[styles.devHint, { color: muted }]}>
                    {`Dev: prefilled ${DEV_TEST_ACCOUNT.username} / ${DEV_TEST_ACCOUNT.password}`}
                  </ThemedText>
                  <ThemedText style={[styles.devHint, { color: muted }]} selectable>
                    {`API: ${apiBaseUrl}`}
                  </ThemedText>
                </View>
              ) : null}

              <ActionPulse pulseKey={successPulse}>
                <PressableScale
                  style={[styles.signInButton, { backgroundColor: cta }]}
                  onPress={onSubmit}
                  disabled={loginMutation.isPending || googleLoginMutation.isPending}>
                  <ThemedText type="defaultSemiBold" style={[styles.signInText, { color: onCta }]}>
                    {loginMutation.isPending ? t('signingIn') : t('signIn')}
                  </ThemedText>
                </PressableScale>
              </ActionPulse>

              <PressableScale style={[styles.googleButton, { borderColor }]} onPress={onGoogle} disabled={googleLoginMutation.isPending}>
                <ThemedText type="defaultSemiBold">{googleLoginMutation.isPending ? t('authConnecting') : t('loginWithGoogle')}</ThemedText>
              </PressableScale>

              <Pressable onPress={() => router.push('/register')}>
                <ThemedText style={[styles.skip, { color: muted }]}>{t('noAccountRegister')}</ThemedText>
              </Pressable>

              <Pressable onPress={() => router.replace('/')}>
                <ThemedText style={[styles.skip, { color: muted }]}>{t('continueWithoutLogin')}</ThemedText>
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
  devHints: { gap: 2, marginTop: 4, marginBottom: 2 },
  devHint: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    opacity: 0.95,
  },
  signInButton: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 6,
    paddingVertical: 14,
  },
  googleButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 14,
  },
  signInText: { fontWeight: '600' },
  skip: {
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
