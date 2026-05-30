import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionCard } from '@/src/components/SectionCard';
import { StatusBadges } from '@/src/components/profile/StatusBadges';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/src/store/auth.store';
import { AppLanguage, ThemePreference, useSettingsStore } from '@/src/store/settings.store';
import { useI18n } from '@/src/i18n';
import { authService } from '@/src/services/api/auth.service';
import { clearPersistedAuthTokens } from '@/src/services/session/session.service';
import { SettingsHubSection } from '@/src/components/settings/SettingsHubSection';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';

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
    <PressableScale
      style={[styles.pill, { borderColor: active ? accent : border, backgroundColor: card }]}
      onPress={onPress}
      hitSlop={8}>
      <ThemedText type="defaultSemiBold" style={{ color: active ? accent : undefined }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const me = useAuthStore((s) => s.me);
  const setMe = useAuthStore((s) => s.setMe);
  const logout = useAuthStore((s) => s.logout);
  const tokens = useAuthStore((s) => s.tokens);
  const deviceId = useAuthStore((s) => s.deviceId);
  const isMember = me?.role === 'MEMBER';

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const text = useThemeColor({}, 'text');
  const card = useThemeColor({}, 'card');

  const initialDisplay = useMemo(
    () => (me?.profile ? me.profile.displayName ?? me.profile.username : ''),
    [me?.profile],
  );
  const initialAvatar = useMemo(() => (me?.profile ? me.profile.avatarUrl ?? '' : ''), [me?.profile]);
  const initialEmail = useMemo(() => me?.profile?.email ?? '', [me?.profile?.email]);
  const [displayNameDraft, setDisplayNameDraft] = useState(initialDisplay);
  const [emailDraft, setEmailDraft] = useState(initialEmail);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(initialAvatar);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileName = displayNameDraft || me?.profile?.username || '';
  const avatarGlyph = (isMember ? profileName : 'G').trim().charAt(0).toUpperCase();
  const isProfileDirty =
    displayNameDraft.trim() !== initialDisplay.trim() ||
    emailDraft.trim() !== initialEmail.trim() ||
    Boolean(selectedAvatarFile) ||
    removeAvatar ||
    avatarUrlDraft.trim() !== initialAvatar.trim();

  useEffect(() => {
    setDisplayNameDraft(initialDisplay);
    setEmailDraft(initialEmail);
    setAvatarUrlDraft(initialAvatar);
    setSelectedAvatarFile(null);
    setRemoveAvatar(false);
  }, [initialDisplay, initialEmail, initialAvatar]);

  const openProfileModal = () => {
    setDisplayNameDraft(initialDisplay);
    setEmailDraft(initialEmail);
    setAvatarUrlDraft(initialAvatar);
    setSelectedAvatarFile(null);
    setRemoveAvatar(false);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setDisplayNameDraft(initialDisplay);
    setEmailDraft(initialEmail);
    setAvatarUrlDraft(initialAvatar);
    setSelectedAvatarFile(null);
    setRemoveAvatar(false);
    setIsProfileModalOpen(false);
  };

  const saveProfile = async () => {
    if (!me?.profile) return;
    try {
      const updated = await authService.updateProfile({
        displayName: displayNameDraft.trim() || me.profile.username,
        email: emailDraft.trim(),
        removeAvatar,
        avatarFile: selectedAvatarFile ?? undefined,
      });
      setMe(updated);
      setIsProfileModalOpen(false);
    } catch {
      Alert.alert(t('saveProfileFailedTitle'), t('saveProfileFailedMessage'));
    }
  };

  const pickAvatarFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('photoPermissionTitle'), t('photoPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSelectedAvatarFile({
      uri: asset.uri,
      name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
    setAvatarUrlDraft(asset.uri);
    setRemoveAvatar(false);
  };

  const takeAvatarPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('cameraPermissionTitle'), t('cameraPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSelectedAvatarFile({
      uri: asset.uri,
      name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
    setAvatarUrlDraft(asset.uri);
    setRemoveAvatar(false);
  };

  const openAvatarActions = () => {
    Alert.alert(t('avatarActionTitle'), t('avatarActionSubtitle'), [
      { text: t('pickFromLibrary'), onPress: pickAvatarFromLibrary },
      { text: t('takePhoto'), onPress: takeAvatarPhoto },
      {
        text: t('removeAvatar'),
        style: 'destructive',
        onPress: () => {
          setSelectedAvatarFile(null);
          setAvatarUrlDraft('');
          setRemoveAvatar(true);
        },
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const requestCloseProfileModal = () => {
    if (!isProfileDirty) {
      closeProfileModal();
      return;
    }

    Alert.alert(t('unsavedProfileTitle'), t('unsavedProfileMessage'), [
      {
        text: t('continueEditingProfile'),
        style: 'cancel',
      },
      {
        text: t('discardProfileChanges'),
        style: 'destructive',
        onPress: closeProfileModal,
      },
      {
        text: t('saveProfile'),
        onPress: saveProfile,
      },
    ]);
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
              <View style={[styles.avatarCircle, { borderColor: border }]}>
                {avatarUrlDraft ? (
                  <Image source={{ uri: avatarUrlDraft }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <ThemedText type="title">{avatarGlyph}</ThemedText>
                )}
              </View>
              <ThemedText type="subtitle" style={styles.profileNameCenter}>
                {profileName}
              </ThemedText>
              <ThemedText style={{ color: muted }}>{`@${me?.profile?.username}`}</ThemedText>
              <Pressable style={[styles.secondaryButton, { borderColor: border }]} onPress={openProfileModal}>
                <ThemedText type="defaultSemiBold">{t('editProfile')}</ThemedText>
              </Pressable>
              {me?.statusDetails?.length ? (
                <View style={styles.statusBadgesWrap}>
                  <ThemedText style={{ color: muted, fontSize: 12 }}>{t('accountStatusTitle')}</ThemedText>
                  <StatusBadges statuses={me.statusDetails} />
                </View>
              ) : null}
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
                <ThemedText type="defaultSemiBold" style={[styles.ctaText, { color: onCta }]}>
                  {t('login')}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>

        {isMember ? <SettingsHubSection /> : null}

        <SectionCard>
          <ThemedText type="defaultSemiBold" style={styles.appearanceTitle}>
            {t('settingsAppearanceCardTitle')}
          </ThemedText>
          <View style={styles.compactPrefsRow}>
            <View style={styles.compactGroup}>
              <ThemedText style={[styles.compactLabel, { color: muted }]}>{t('languageSection')}</ThemedText>
              <View style={styles.compactPills}>
                <OptionPill label="VI" active={language === 'vi'} onPress={() => setLanguage('vi' as AppLanguage)} />
                <OptionPill label="EN" active={language === 'en'} onPress={() => setLanguage('en' as AppLanguage)} />
              </View>
            </View>
            <View style={[styles.compactDivider, { backgroundColor: border }]} />
            <View style={styles.compactGroup}>
              <ThemedText style={[styles.compactLabel, { color: muted }]}>{t('themeSection')}</ThemedText>
              <View style={styles.compactPills}>
                <OptionPill label={t('themeLight')} active={themePreference === 'light'} onPress={() => setThemePreference('light' as ThemePreference)} />
                <OptionPill label={t('themeDark')} active={themePreference === 'dark'} onPress={() => setThemePreference('dark' as ThemePreference)} />
                <OptionPill label={t('themeSystem')} active={themePreference === 'system'} onPress={() => setThemePreference('system' as ThemePreference)} />
              </View>
            </View>
          </View>
        </SectionCard>

        {isMember ? (
          <PressableScale
            style={[styles.inlineLogoutButton, { borderColor: border }]}
            onPress={() => {
              Alert.alert(t('logout'), t('logoutConfirm'), [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('logout'),
                  style: 'destructive',
                  onPress: async () => {
                    if (tokens?.refreshToken && deviceId) {
                      try {
                        await authService.logout({ refreshToken: tokens.refreshToken, deviceId });
                      } catch {
                        // Keep local logout resilient even if network/logout endpoint fails.
                      }
                    }
                    await clearPersistedAuthTokens();
                    logout();
                    router.replace('/');
                  },
                },
              ]);
            }}>
            <ThemedText type="defaultSemiBold" style={{ color: muted }}>
              {t('logout')}
            </ThemedText>
          </PressableScale>
        ) : null}
      </ScrollView>
      {isMember ? (
        <Modal
          visible={isProfileModalOpen}
          animationType="fade"
          transparent
          onRequestClose={requestCloseProfileModal}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={requestCloseProfileModal} />
            <View style={[styles.modalCard, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">{t('editProfile')}</ThemedText>
                <Pressable onPress={requestCloseProfileModal} hitSlop={8}>
                  <ThemedText style={{ color: muted }} type="defaultSemiBold">
                    {t('close')}
                  </ThemedText>
                </Pressable>
              </View>
              <View style={[styles.modalProfileRow, { borderColor: border }]}>
                <Pressable style={[styles.modalAvatarCircle, { borderColor: border }]} onPress={openAvatarActions}>
                  {avatarUrlDraft ? (
                    <Image source={{ uri: avatarUrlDraft }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <ThemedText type="title">{avatarGlyph}</ThemedText>
                  )}
                  <View style={[styles.avatarEditOverlay, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
                    <IconSymbol name="camera.fill" color="#fff" size={16} />
                  </View>
                </Pressable>
                <View style={styles.modalIdentity}>
                  <ThemedText type="defaultSemiBold">{profileName}</ThemedText>
                  <ThemedText style={{ color: muted }} numberOfLines={1}>
                    {me?.profile?.email ?? t('noEmail')}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.modalFieldGroup}>
                <ThemedText style={{ color: muted }}>{t('displayName')}</ThemedText>
                <ThemedTextInput
                  value={displayNameDraft}
                  onChangeText={setDisplayNameDraft}
                  placeholder={me?.profile?.username ?? ''}
                />
              </View>
              <View style={styles.modalFieldGroup}>
                <ThemedText style={{ color: muted }}>{t('email')}</ThemedText>
                <ThemedTextInput
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  placeholder={t('noEmail')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.modalFooter}>
                <Pressable style={[styles.primaryButton, { backgroundColor: cta }]} onPress={saveProfile}>
                  <ThemedText type="defaultSemiBold" style={[styles.ctaText, { color: onCta }]}>
                    {t('saveProfile')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { gap: 12 },
  prefsLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36 },
  profileHeaderCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    alignItems: 'center',
  },
  statusBadgesWrap: { alignItems: 'center', gap: 6, marginTop: 4, width: '100%' },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  profileNameCenter: {
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  appearanceTitle: { fontSize: 16, marginBottom: 10 },
  compactPrefsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  compactGroup: { flex: 1, gap: 6, minWidth: 0 },
  compactLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  compactPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compactDivider: { width: 1, alignSelf: 'stretch', opacity: 0.6 },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ctaButton: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  ctaText: { fontWeight: '600' },
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
    minWidth: 140,
  },
  inlineLogoutButton: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalFieldGroup: {
    gap: 4,
  },
  modalProfileRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalAvatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIdentity: {
    flex: 1,
    gap: 2,
  },
  modalFooter: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
});

