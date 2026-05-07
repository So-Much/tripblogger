import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionCard } from '@/src/components/SectionCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/src/store/auth.store';
import { AppLanguage, ThemePreference, useSettingsStore } from '@/src/store/settings.store';
import { useI18n } from '@/src/i18n';

function OptionPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const accent = useThemeColor({}, 'accent');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        { borderColor: active ? accent : border, backgroundColor: card },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
      hitSlop={8}
    >
      <ThemedText type="defaultSemiBold" style={{ color: active ? accent : undefined }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const me = useAuthStore((s) => s.me);
  const setMe = useAuthStore((s) => s.setMe);
  const logout = useAuthStore((s) => s.logout);
  const isMember = me?.role === 'MEMBER';

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const text = useThemeColor({}, 'text');
  const card = useThemeColor({}, 'card');

  const initialDisplay = useMemo(
    () => (me?.profile ? me.profile.displayName ?? me.profile.username : ''),
    [me?.profile],
  );
  const initialAvatar = useMemo(() => (me?.profile ? me.profile.avatarUrl ?? '' : ''), [me?.profile]);
  const [displayName, setDisplayName] = useState(initialDisplay);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);

  const saveProfile = () => {
    if (!me?.profile) return;
    setMe({
      ...me,
      profile: {
        ...me.profile,
        displayName: displayName.trim() || me.profile.username,
        avatarUrl: avatarUrl.trim() || null,
      },
    });
  };

  return (
    <ThemedView style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 14) + 14,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <ThemedText type="title" style={styles.title}>
          {t('settingsTitle')}
        </ThemedText>
        <ThemedText style={{ color: muted }}>{t('settingsSubtitle')}</ThemedText>
        <View style={[styles.accountBadge, { borderColor: border, backgroundColor: card }]}>
          <ThemedText type="defaultSemiBold">{isMember ? (me?.profile?.displayName ?? me?.profile?.username) : 'Guest mode'}</ThemedText>
          <ThemedText style={{ color: muted }}>
            {isMember ? `@${me?.profile?.username}` : 'Sign in to sync profile and preferences'}
          </ThemedText>
        </View>

        <SectionCard>
          <ThemedText type="subtitle">{t('profileSection')}</ThemedText>
          {isMember ? (
            <View style={styles.block}>
              <ThemedText style={{ color: muted }}>{t('displayName')}</ThemedText>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                style={[styles.input, { borderColor: border, color: text }]}
                placeholder={me?.profile?.username ?? ''}
                placeholderTextColor={muted}
              />
              <ThemedText style={{ color: muted }}>{t('avatarUrl')}</ThemedText>
              <TextInput
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                style={[styles.input, { borderColor: border, color: text }]}
                placeholderTextColor={muted}
                autoCapitalize="none"
              />
              <Pressable style={[styles.ctaButton, { backgroundColor: cta }]} onPress={saveProfile}>
                <ThemedText type="defaultSemiBold" style={styles.ctaText}>
                  {t('saveProfile')}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.block}>
              <ThemedText style={{ color: muted }}>{t('profileGuestHint')}</ThemedText>
              <Pressable style={[styles.ctaButton, { backgroundColor: cta }]} onPress={() => router.push('/login')}>
                <ThemedText type="defaultSemiBold" style={styles.ctaText}>
                  {t('login')}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <ThemedText type="subtitle">{t('languageSection')}</ThemedText>
          <View style={styles.optionsRow}>
            <OptionPill label={t('languageVi')} active={language === 'vi'} onPress={() => setLanguage('vi' as AppLanguage)} />
            <OptionPill label={t('languageEn')} active={language === 'en'} onPress={() => setLanguage('en' as AppLanguage)} />
          </View>
        </SectionCard>

        <SectionCard>
          <ThemedText type="subtitle">{t('themeSection')}</ThemedText>
          <View style={styles.optionsWrap}>
            <OptionPill label={t('themeLight')} active={themePreference === 'light'} onPress={() => setThemePreference('light' as ThemePreference)} />
            <OptionPill label={t('themeDark')} active={themePreference === 'dark'} onPress={() => setThemePreference('dark' as ThemePreference)} />
            <OptionPill label={t('themeSystem')} active={themePreference === 'system'} onPress={() => setThemePreference('system' as ThemePreference)} />
          </View>
        </SectionCard>

        <SectionCard>
          <ThemedText type="subtitle">{t('accountSection')}</ThemedText>
          <View style={styles.block}>
            {isMember ? (
              <Pressable
                style={[styles.ctaButton, { backgroundColor: cta }]}
                onPress={() => {
                  logout();
                  router.replace('/');
                }}
              >
                <ThemedText type="defaultSemiBold" style={styles.ctaText}>
                  {t('logout')}
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <Pressable style={[styles.ctaButton, { backgroundColor: cta }]} onPress={() => router.push('/login')}>
                  <ThemedText type="defaultSemiBold" style={styles.ctaText}>
                    {t('login')}
                  </ThemedText>
                </Pressable>
                <Pressable style={[styles.outlineButton, { borderColor: border }]} onPress={() => router.push('/register')}>
                  <ThemedText type="defaultSemiBold">{t('register')}</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { gap: 12 },
  title: { fontSize: 30, lineHeight: 36 },
  accountBadge: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  block: { gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ctaButton: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  ctaText: { color: '#fff' },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 12,
  },
});

