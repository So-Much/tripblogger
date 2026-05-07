import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommerceWidgetRow } from '@/src/components/commerce/CommerceWidgetRow';
import { FeedSection } from '@/src/components/feed/FeedSection';
import { StoriesRow } from '@/src/components/feed/StoriesRow';
import { PromoBanner } from '@/src/components/home/PromoBanner';
import { HomeSearchBar } from '@/src/components/home/HomeSearchBar';
import { QuickActionsStrip } from '@/src/components/home/QuickActionsStrip';
import { ProfileSummaryCard } from '@/src/components/profile/ProfileSummaryCard';
import { COMMERCE_DEALS } from '@/src/mocks/commerce.mock';
import { FEED_POSTS } from '@/src/mocks/feed.mock';
import { FEED_STORIES } from '@/src/mocks/stories.mock';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';

export function HomeScreen() {
  const router = useRouter();
  const meQuery = useMeQuery();
  const { t } = useI18n();
  const cta = useThemeColor({}, 'cta');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const insets = useSafeAreaInsets();

  const isMember = meQuery.data?.role === 'MEMBER';

  const memberProfile =
    isMember && meQuery.data?.profile
      ? {
          displayName: meQuery.data.profile.displayName ?? meQuery.data.profile.username,
          handle: `@${meQuery.data.profile.username}`,
          followers: '12.4k',
          following: '620',
          posts: '89',
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

        <HomeSearchBar />
        <StoriesRow stories={FEED_STORIES} />
        <PromoBanner />
        <QuickActionsStrip />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('homeToday')}
        </ThemedText>
        <ThemedText style={[styles.subtitleLine, { color: muted }]}>
          {isMember ? t('homeSubtitleMember') : t('homeSubtitleGuest')}
        </ThemedText>

        {isMember && memberProfile ? (
          <ProfileSummaryCard profile={memberProfile} />
        ) : null}

        <CommerceWidgetRow deals={COMMERCE_DEALS} />
        <FeedSection posts={FEED_POSTS} />
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
  loginButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
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
