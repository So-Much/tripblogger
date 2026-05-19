import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HomePostsFeed } from '@/src/components/feed/HomePostsFeed';
import { HomeCommerceDeals } from '@/src/components/home/HomeCommerceDeals';
import { PromoBanner } from '@/src/components/home/PromoBanner';
import { HomeSearchBar } from '@/src/components/home/HomeSearchBar';
import { QuickActionsStrip } from '@/src/components/home/QuickActionsStrip';
import { ProfileSummaryCard } from '@/src/components/profile/ProfileSummaryCard';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { authService } from '@/src/services/api/auth.service';
import { useAuthStore } from '@/src/store/auth.store';
import { hasCustomDisplayName, resolvePublicDisplayName } from '@/src/utils/display-name';

export function HomeScreen() {
  const router = useRouter();
  useMeQuery();
  const { t } = useI18n();
  const me = useAuthStore((s) => s.me);
  const hasAccessToken = Boolean(useAuthStore((s) => s.tokens?.accessToken));
  const cta = useThemeColor({}, 'cta');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const text = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  const isMember = hasAccessToken && me?.role === 'MEMBER';

  const { data: memberStats } = useQuery({
    queryKey: ['users', 'me', 'stats'],
    queryFn: () => authService.getMemberStats(),
    enabled: isMember,
  });

  const memberProfile =
    isMember && me?.profile
      ? {
          displayName: resolvePublicDisplayName(me.profile.displayName, me.profile.username),
          handle: hasCustomDisplayName(me.profile.displayName) ? undefined : `@${me.profile.username}`,
          postsCount: memberStats?.postsCount,
          productsCount: memberStats?.productsCount,
          bio: 'Creator profile with social + commerce experiences.',
        }
      : null;

  return (
    <ThemedView style={[styles.page, { backgroundColor: surface }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8) + 4,
            paddingBottom: Math.max(insets.bottom, 12) + 28,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
        scrollIndicatorInsets={{ right: 1 }}
      >
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <View style={[styles.brandBadge, { borderColor: border, backgroundColor: card }]}>
              <IconSymbol size={26} name="paperplane.fill" color={cta} />
            </View>
            <ThemedText type="title" style={styles.title}>
              TripBlogger
            </ThemedText>
          </View>

          {!isMember ? (
            <Pressable style={[styles.loginButton, { backgroundColor: cta }]} onPress={() => router.push('/login')}>
              <ThemedText type="defaultSemiBold" style={styles.loginText}>
                {t('login')}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.avatarButton, { borderColor: border, backgroundColor: card }]}
              onPress={() => router.push('/explore')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <IconSymbol size={24} name="person.crop.circle.fill" color={cta} />
            </Pressable>
          )}
        </View>

        <View style={[styles.welcomeCard, { borderColor: border, backgroundColor: card }]}>
          <ThemedText type="defaultSemiBold" style={[styles.welcomeTitle, { color: text }]}>
            {isMember ? t('homeHeroTitleMember') : t('homeHeroTitleGuest')}
          </ThemedText>
          <ThemedText style={{ color: muted }}>
            {isMember ? t('homeHeroSubtitleMember') : t('homeHeroSubtitleGuest')}
          </ThemedText>
          {!isMember ? (
            <View style={styles.guestActions}>
              <Pressable style={[styles.ghostButton, { borderColor: border }]} onPress={() => router.push('/register')}>
                <ThemedText type="defaultSemiBold">{t('register')}</ThemedText>
              </Pressable>
              <Pressable style={[styles.primaryButton, { backgroundColor: cta }]} onPress={() => router.push('/login')}>
                <ThemedText type="defaultSemiBold" style={styles.loginText}>
                  {t('login')}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>

        <HomeSearchBar onPress={() => router.push('/(tabs)/shop/search')} />
        <PromoBanner />
        <QuickActionsStrip
          onActionPress={(key) => {
            if (key === 'shop') router.push('/(tabs)/shop');
            else if (key === 'live') router.push('/(tabs)/capture');
            else if (key === 'inbox') router.push('/explore');
          }}
        />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('homeToday')}
        </ThemedText>
        <ThemedText style={[styles.subtitleLine, { color: muted }]}>
          {isMember ? t('homeSubtitleMember') : t('homeSubtitleGuest')}
        </ThemedText>

        {isMember && memberProfile ? (
          <ProfileSummaryCard profile={memberProfile} />
        ) : null}

        <HomeCommerceDeals />
        <HomePostsFeed />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    gap: 14,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 48,
  },
  brandWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  brandBadge: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: { fontSize: 28, letterSpacing: -0.6, flexShrink: 1 },
  welcomeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  welcomeTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  guestActions: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  loginButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ghostButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loginText: { color: '#fff' },
  avatarButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 10,
    width: 46,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 26,
  },
  subtitleLine: {
    marginTop: -8,
    fontSize: 13,
    lineHeight: 18,
  },
});
