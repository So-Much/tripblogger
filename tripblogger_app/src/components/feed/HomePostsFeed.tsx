import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PostPreviewCard } from '@/src/components/posts/PostPreviewCard';
import { ReactionPicker } from '@/src/components/posts/ReactionPicker';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import { applyPostPatch, optimisticTogglePostReaction } from '@/src/services/realtime/posts-realtime.sync';
import { useAuthStore } from '@/src/store/auth.store';
import type { PostDto } from '@/src/types/post';
import { formatApiError } from '@/src/utils/format-api-error';
import { getViewerPostReactionCode } from '@/src/utils/post-reactions';
import { useCallback, useMemo, useState } from 'react';

export function HomePostsFeed() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const hasAccessToken = Boolean(useAuthStore((s) => s.tokens?.accessToken));
  const isMember = meQuery.data?.role === 'MEMBER';

  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [reactPostId, setReactPostId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);

  const reactionTypesQuery = useQuery({
    queryKey: ['posts', 'reaction-types'],
    queryFn: () => postsService.listReactionTypes(),
    enabled: isMember === true,
  });

  const feedQuery = useInfiniteQuery({
    queryKey: ['posts', 'feed'],
    queryFn: ({ pageParam }) =>
      postsService.listFeed({ limit: 12, cursor: pageParam as string | undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: hasAccessToken,
  });

  const items = useMemo(() => feedQuery.data?.pages.flatMap((p) => p.items) ?? [], [feedQuery.data?.pages]);
  const postReactionTypes = useMemo(
    () =>
      (reactionTypesQuery.data ?? []).filter((t) => (t.useFor === 'POST' || t.useFor === 'BOTH') && t.code !== 'SHARE'),
    [reactionTypesQuery.data],
  );

  const reactMutation = useMutation({
    mutationFn: ({ postId, typeCode }: { postId: string; typeCode: string }) =>
      postsService.togglePostReaction(postId, typeCode),
    onMutate: async ({ postId, typeCode }) => {
      const snapshot = optimisticTogglePostReaction(queryClient, postId, typeCode);
      return { snapshot };
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
    onError: (_e, _vars, context) => {
      if (context?.snapshot) {
        applyPostPatch(queryClient, {
          postId: context.snapshot.id,
          reactionCounts: context.snapshot.reactionCounts,
          myReactionCodes: context.snapshot.myReactionCodes,
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
      }
    },
  });

  const shareMutation = useMutation({
    mutationFn: (postId: string) => postsService.sharePost(postId),
    onSuccess: (result) => {
      applyPostPatch(queryClient, {
        postId: result.post.id,
        reactionCounts: result.post.reactionCounts,
        myReactionCodes: result.post.myReactionCodes,
        commentCount: result.post.commentCount,
        shareCount: result.post.shareCount,
      });
    },
  });

  const renderPost = useCallback(
    (item: PostDto) => (
      <PostPreviewCard
        key={item.id}
        post={item}
        onPress={() => router.push(`/(tabs)/posts/${item.id}`)}
        onDoubleTapHeart={() => {
          if (!isMember) return;
          reactMutation.mutate({ postId: item.id, typeCode: 'HEART' });
        }}
        onOpenReactionPicker={(anchor) => {
          if (!isMember) return;
          setReactPostId(item.id);
          setPickerAnchor(anchor);
          setPickerOpen(true);
        }}
        onShare={isMember ? () => shareMutation.mutate(item.id) : undefined}
        cardColor={card}
        borderColor={border}
        mutedColor={muted}
        reactionTypes={postReactionTypes}
      />
    ),
    [router, isMember, reactMutation, shareMutation, card, border, muted, postReactionTypes],
  );

  if (!hasAccessToken) {
    return (
      <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('homeFeedLoading')}</ThemedText>
    );
  }

  if (feedQuery.isError) {
    return (
      <ThemedText style={{ color: muted, textAlign: 'center' }}>
        {formatApiError(feedQuery.error, t('homeFeedError'))}
      </ThemedText>
    );
  }

  if (feedQuery.isLoading) {
    return <ActivityIndicator />;
  }

  if (!items.length) {
    return (
      <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('homeFeedEmpty')}</ThemedText>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.list}>{items.map(renderPost)}</View>
      {feedQuery.hasNextPage ? (
        <Pressable
          onPress={() => void feedQuery.fetchNextPage()}
          disabled={feedQuery.isFetchingNextPage}
          style={[styles.loadMore, { borderColor: border }]}>
          {feedQuery.isFetchingNextPage ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: tint }}>
              {t('homeFeedLoadMore')}
            </ThemedText>
          )}
        </Pressable>
      ) : null}
      <ReactionPicker
        open={pickerOpen}
        anchor={pickerAnchor}
        options={postReactionTypes}
        selectedCode={(() => {
          const target = items.find((p) => p.id === reactPostId);
          return target ? getViewerPostReactionCode(target) : null;
        })()}
        onClose={() => setPickerOpen(false)}
        onSelect={(typeCode) => {
          if (!reactPostId) return;
          reactMutation.mutate({ postId: reactPostId, typeCode });
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  list: { gap: 12 },
  loadMore: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 140,
    alignItems: 'center',
  },
});
