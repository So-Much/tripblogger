import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ProfileSummaryCard } from '@/src/components/profile/ProfileSummaryCard';
import { useAuthStore } from '@/src/store/auth.store';
import { useI18n } from '@/src/i18n';

export function ProfileScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const me = useAuthStore((s) => s.me);
  const isMember = me?.role === 'MEMBER';
  const logout = useAuthStore((s) => s.logout);
  const accent = useThemeColor({}, 'accent');
  const surface = useThemeColor({}, 'surface');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const insets = useSafeAreaInsets();

  const profile = me?.profile
    ? {
        displayName: me.profile.displayName ?? me.profile.username,
        handle: `@${me.profile.username}`,
        followers: '12.4k',
        following: '620',
        posts: '89',
        bio: t('profileMemberBio'),
      }
    : {
        displayName: 'Member',
        handle: '@member',
        followers: '—',
        following: '—',
        posts: '—',
        bio: t('profileLoadingBio'),
      };

  return (
    <ThemedView style={[styles.page, { backgroundColor: surface }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8) + 4,
            paddingBottom: Math.max(insets.bottom, 12) + 16,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: border, backgroundColor: card },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" color={accent} size={24} />
          </Pressable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>
            {t('profileTitle')}
          </ThemedText>
        </View>

        {isMember ? (
          <>
            <ProfileSummaryCard profile={profile} />

            <ThemedText style={{ color: muted, fontSize: 14, lineHeight: 20 }}>
              {t('profileMoreFeaturesHint')}
            </ThemedText>

            <Pressable
              style={[styles.logout, { backgroundColor: accent }]}
              onPress={() => {
                logout();
                router.replace('/');
              }}
            >
              <ThemedText type="defaultSemiBold" style={styles.logoutText}>
                {t('logout')}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <View style={[styles.guestCard, { borderColor: border, backgroundColor: card }]}>
            <IconSymbol name="person.crop.circle.fill" color={accent} size={48} />
            <ThemedText type="subtitle" style={styles.guestTitle}>
              {t('profileGuestCtaTitle')}
            </ThemedText>
            <ThemedText style={{ color: muted, textAlign: 'center' }}>
              {t('profileGuestCtaSubtitle')}
            </ThemedText>
            <Pressable style={[styles.authButton, { backgroundColor: accent }]} onPress={() => router.push('/login')}>
              <ThemedText type="defaultSemiBold" style={styles.authButtonText}>
                {t('login')}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.authOutlineButton, { borderColor: border }]}
              onPress={() => router.push('/register')}
            >
              <ThemedText type="defaultSemiBold">{t('createAccount')}</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    gap: 14,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 'auto',
    width: 42,
  },
  pressed: {
    opacity: 0.9,
  },
  logout: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 8,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#fff',
  },
  guestCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  guestTitle: {
    textAlign: 'center',
  },
  authButton: {
    marginTop: 4,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  authButtonText: {
    color: '#fff',
  },
  authOutlineButton: {
    borderWidth: 1,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
});
