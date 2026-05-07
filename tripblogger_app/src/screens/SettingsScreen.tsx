import { useEffect, useMemo, useState } from 'react';
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const avatarGlyph = (isMember ? displayName || me?.profile?.username : 'G').trim().charAt(0).toUpperCase();

  useEffect(() => {
    setDisplayName(initialDisplay);
    setAvatarUrl(initialAvatar);
  }, [initialDisplay, initialAvatar]);

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
    setIsEditingProfile(false);
    setShowAvatarEditor(false);
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
        <View style={[styles.profileHeaderCard, { borderColor: border, backgroundColor: card }]}>
          {isMember ? (
            <>
              <Pressable
                style={[styles.avatarCircle, { borderColor: border }]}
                onPress={() => isEditingProfile && setShowAvatarEditor((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={t('avatarUrl')}
              >
                <ThemedText type="title">{avatarGlyph}</ThemedText>
              </Pressable>
              {isEditingProfile ? (
                <View style={styles.editBlock}>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    style={[styles.nameInput, { borderColor: border, color: text }]}
                    placeholder={me?.profile?.username ?? ''}
                    placeholderTextColor={muted}
                    textAlign="center"
                  />
                  <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('tapAvatarToEdit')}</ThemedText>
                  {showAvatarEditor ? (
                    <TextInput
                      value={avatarUrl}
                      onChangeText={setAvatarUrl}
                      style={[styles.input, styles.avatarInputInline, { borderColor: border, color: text }]}
                      placeholder={t('avatarUrl')}
                      placeholderTextColor={muted}
                      autoCapitalize="none"
                    />
                  ) : null}
                  <View style={styles.editActionsRow}>
                    <Pressable
                      style={[styles.secondaryButton, { borderColor: border }]}
                      onPress={() => {
                        setDisplayName(initialDisplay);
                        setAvatarUrl(initialAvatar);
                        setIsEditingProfile(false);
                        setShowAvatarEditor(false);
                      }}
                    >
                      <ThemedText type="defaultSemiBold" style={{ color: muted }}>
                        {t('doneEditing')}
                      </ThemedText>
                    </Pressable>
                    <Pressable style={[styles.primaryButton, { backgroundColor: cta }]} onPress={saveProfile}>
                      <ThemedText type="defaultSemiBold" style={styles.ctaText}>
                        {t('saveProfile')}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <ThemedText type="subtitle" style={styles.profileNameCenter}>
                    {displayName || me?.profile?.username}
                  </ThemedText>
                  <ThemedText style={{ color: muted }}>{`@${me?.profile?.username}`}</ThemedText>
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: border }]}
                    onPress={() => setIsEditingProfile(true)}
                  >
                    <ThemedText type="defaultSemiBold">{t('editProfile')}</ThemedText>
                  </Pressable>
                </>
              )}
            </>
          ) : (
            <>
              <View style={[styles.avatarCircle, { borderColor: border }]}>
                <ThemedText type="title">{avatarGlyph}</ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.profileNameCenter}>
                {t('settingsGuestMode')}
              </ThemedText>
              <ThemedText style={{ color: muted }}>{t('settingsGuestSyncHint')}</ThemedText>
              <Pressable style={[styles.primaryButton, { backgroundColor: cta }]} onPress={() => router.push('/login')}>
                <ThemedText type="defaultSemiBold" style={styles.ctaText}>
                  {t('login')}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>

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

        {isMember ? (
          <Pressable
            style={[styles.inlineLogoutButton, { borderColor: border }]}
            onPress={() => {
              logout();
              router.replace('/');
            }}
          >
            <ThemedText type="defaultSemiBold" style={{ color: muted }}>
              {t('logout')}
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { gap: 12 },
  title: { fontSize: 30, lineHeight: 36 },
  profileHeaderCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  profileNameCenter: {
    textAlign: 'center',
  },
  editBlock: {
    width: '100%',
    gap: 8,
    marginTop: 2,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 180,
    fontSize: 17,
    fontWeight: '600',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 8,
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
  primaryButton: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  avatarInputInline: {
    width: '100%',
  },
  inlineLogoutButton: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
});

