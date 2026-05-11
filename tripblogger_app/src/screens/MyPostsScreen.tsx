import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { PostPreviewCard } from '@/src/components/posts/PostPreviewCard';
import { ReactionPicker } from '@/src/components/posts/ReactionPicker';
import { applyPostPatch } from '@/src/services/realtime/posts-realtime.sync';

export function MyPostsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  const isMember = meQuery.data?.role === 'MEMBER';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reactPostId, setReactPostId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

  const reactionTypesQuery = useQuery({
    queryKey: ['posts', 'reaction-types'],
    queryFn: () => postsService.listReactionTypes(),
    enabled: isMember === true,
  });

  const query = useInfiniteQuery({
    queryKey: ['posts', 'mine', statusFilter],
    queryFn: ({ pageParam }) =>
      postsService.listMine({
        limit: 20,
        cursor: pageParam as string | undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: isMember === true,
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data?.pages]);
  const postReactionTypes = useMemo(
    () =>
      (reactionTypesQuery.data ?? []).filter((t) => (t.useFor === 'POST' || t.useFor === 'BOTH') && t.code !== 'SHARE'),
    [reactionTypesQuery.data],
  );

  const reactMutation = useMutation({
    mutationFn: ({ postId, typeCode }: { postId: string; typeCode: string }) =>
      postsService.togglePostReaction(postId, typeCode),
    onMutate: async ({ postId, typeCode }) => {
      const prev = queryClient.getQueryData(['posts', postId]) as PostDto | undefined;
      if (!prev) return { prev };
      const existedCode = prev.myReactionCodes.find((code) => code !== 'SHARE');
      const isSame = existedCode === typeCode;
      const nextCounts = { ...prev.reactionCounts };
      const nextMyReactionCodes: string[] = prev.myReactionCodes.filter((code) => code === 'SHARE');
      if (existedCode) {
        nextCounts[existedCode] = Math.max((nextCounts[existedCode] ?? 0) - 1, 0);
      }
      if (!isSame) {
        nextCounts[typeCode] = (nextCounts[typeCode] ?? 0) + 1;
        nextMyReactionCodes.push(typeCode);
      }
      applyPostPatch(queryClient, {
        postId,
        reactionCounts: nextCounts,
        myReactionCodes: nextMyReactionCodes,
      });
      return { prev };
    },
    onSuccess: (result) => {
      applyPostPatch(queryClient, {
        postId: result.post.id,
        reactionCounts: result.post.reactionCounts,
        myReactionCodes: result.post.myReactionCodes,
        commentCount: result.post.commentCount,
        shareCount: result.post.shareCount,
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
    },
  });

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
      <PostPreviewCard
        post={item}
        onPress={() =>
          router.push(item.status === 'DRAFT' ? `/(tabs)/posts/create?postId=${item.id}` : `/(tabs)/posts/${item.id}`)
        }
        onDoubleTapHeart={async () => {
          reactMutation.mutate({ postId: item.id, typeCode: 'HEART' });
        }}
        onOpenReactionPicker={(anchor) => {
          setReactPostId(item.id);
          setPickerAnchor(anchor);
          setPickerOpen(true);
        }}
        cardColor={card}
        borderColor={border}
        mutedColor={muted}
        reactionTypes={postReactionTypes}
      />
    ),
    [router, reactMutation, card, border, muted, postReactionTypes],
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
        <ThemedText>{formatApiError(query.error, 'Không thể tải danh sách bài viết.')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <ThemedView style={styles.filterRow}>
        {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[
              styles.filterChip,
              {
                borderColor: s === statusFilter ? tint : border,
                backgroundColor: s === statusFilter ? `${tint}22` : 'transparent',
              },
            ]}>
            <ThemedText style={styles.filterTxt}>
              {s === 'ALL' ? 'Tất cả' : s === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản'}
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>
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
      <ReactionPicker
        open={pickerOpen}
        anchor={pickerAnchor}
        options={postReactionTypes}
        selectedCode={items.find((p) => p.id === reactPostId)?.myReactionCodes.find((code) => code !== 'SHARE') ?? null}
        onClose={() => setPickerOpen(false)}
        onSelect={(typeCode) => {
          if (!reactPostId) return;
          reactMutation.mutate({ postId: reactPostId, typeCode });
          setPickerOpen(false);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterTxt: { fontSize: 12, fontWeight: '600' },
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
  headerBtn: { marginRight: 8, padding: 4 },
  footerLoader: { marginVertical: 16 },
});
