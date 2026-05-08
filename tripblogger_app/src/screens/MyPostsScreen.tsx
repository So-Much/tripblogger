import { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import type { PostDto } from '@/src/types/post';
import { formatApiError } from '@/src/utils/format-api-error';

function previewFromHtml(html: string, max = 140): string {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function MyPostsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const meQuery = useMeQuery();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  const isMember = meQuery.data?.role === 'MEMBER';

  const query = useInfiniteQuery({
    queryKey: ['posts', 'mine'],
    queryFn: ({ pageParam }) =>
      postsService.listMine({ limit: 20, cursor: pageParam as string | undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: isMember === true,
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data?.pages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isMember ? (
          <Pressable
            onPress={() => router.push('/(tabs)/posts/create')}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('postsNew')}>
            <IconSymbol name="plus.circle.fill" size={26} color={tint} />
          </Pressable>
        ) : null,
    });
  }, [navigation, router, tint, isMember, t]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  const renderItem = useCallback(
    ({ item }: { item: PostDto }) => (
      <Pressable
        onPress={() => router.push(`/(tabs)/posts/${item.id}`)}
        style={[styles.row, { backgroundColor: card, borderColor: border }]}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.preview, { color: muted }]} numberOfLines={2}>
          {previewFromHtml(item.contentHtml)}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText style={[styles.meta, { color: muted }]}>
            {new Date(item.createdAt).toLocaleString()}
          </ThemedText>
          <ThemedText style={[styles.badge, { color: muted }]}>{item.status}</ThemedText>
        </View>
      </Pressable>
    ),
    [router, card, border, muted],
  );

  if (meQuery.isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!isMember) {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.guestWrap}>
          <ThemedText type="subtitle">{t('postsMemberRequired')}</ThemedText>
          <Pressable onPress={() => router.push('/(auth)/login')} style={[styles.cta, { borderColor: border }]}>
            <ThemedText type="link">{t('login')}</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (query.isError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{formatApiError(query.error)}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator />
          ) : (
            <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('postsEmpty')}</ThemedText>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footerLoader} />
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guestWrap: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  cta: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  row: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  preview: { fontSize: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 12 },
  badge: { fontSize: 11, textTransform: 'uppercase' },
  headerBtn: { marginRight: 8, padding: 4 },
  footerLoader: { marginVertical: 16 },
});
