import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import type { CommentDto, PostDto, ReactionTypeDto } from '@/src/types/post';
import { formatApiError } from '@/src/utils/format-api-error';
import { PostMediaBlock } from '@/src/components/posts/PostMediaBlock';
import { ReactionPicker } from '@/src/components/posts/ReactionPicker';
import { CommentThread } from '@/src/components/posts/CommentThread';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { ShakeView, type ShakeViewHandle } from '@/src/components/feedback/ShakeView';
import { formatLocalDateTime } from '@/src/utils/datetime';
import { getPostBodyPlainText } from '@/src/utils/post-hashtag-content';
import { resolvePublicDisplayName } from '@/src/utils/display-name';
import {
  getPostReactionTotal,
  getViewerPostReactionCode,
  isViewerPostHearted,
} from '@/src/utils/post-reactions';
import { postsRealtimeClient } from '@/src/services/realtime/posts-realtime.client';
import { applyCommentCreated, applyPostPatch, optimisticTogglePostReaction } from '@/src/services/realtime/posts-realtime.sync';
import { useAuthStore } from '@/src/store/auth.store';

const SINGLE_TAP_DELAY_MS = 240;

function postReactionTypes(types: ReactionTypeDto[]): ReactionTypeDto[] {
  return types.filter((t) => (t.useFor === 'POST' || t.useFor === 'BOTH') && t.code !== 'SHARE');
}

export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const hasAccessToken = Boolean(useAuthStore((s) => s.tokens?.accessToken));
  const isMember = meQuery.data?.role === 'MEMBER';

  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const bg = useThemeColor({}, 'background');

  const typesQuery = useQuery({
    queryKey: ['posts', 'reaction-types'],
    queryFn: () => postsService.listReactionTypes(),
    enabled: isMember === true,
  });

  const postQuery = useQuery({
    queryKey: ['posts', id],
    queryFn: () => postsService.getPost(String(id)),
    enabled: Boolean(id) && hasAccessToken,
  });

  const commentsQuery = useInfiniteQuery({
    queryKey: ['posts', id, 'comments'],
    queryFn: ({ pageParam }) =>
      postsService.listComments(String(id), { limit: 20, cursor: pageParam as string | undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(id) && isMember === true && postQuery.data?.status === 'PUBLISHED',
  });
  const reactorsQuery = useQuery({
    queryKey: ['posts', id, 'reactors'],
    queryFn: () => postsService.listPostReactors(String(id)),
    enabled: Boolean(id) && isMember === true && postQuery.data?.status === 'PUBLISHED',
  });

  const post = postQuery.data;

  useEffect(() => {
    if (!id) return;
    postsRealtimeClient.joinPost(String(id));
    return () => {
      postsRealtimeClient.leavePost(String(id));
    };
  }, [id]);

  const postTypes = useMemo(
    () => postReactionTypes(typesQuery.data ?? []),
    [typesQuery.data],
  );

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);
  const [commentInputHeight, setCommentInputHeight] = useState(42);
  const [showReactors, setShowReactors] = useState(false);
  const composerShakeRef = useRef<ShakeViewHandle>(null);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaInteractingRef = useRef(false);
  const lastMediaInteractionAt = useRef(0);
  const reactedCode = post ? getViewerPostReactionCode(post) : null;
  const viewerHearted = post ? isViewerPostHearted(post) : false;
  const heartScale = useRef(new Animated.Value(1)).current;
  const previousReactedCodeRef = useRef<boolean | undefined>(undefined);
  const totalReacts = post ? getPostReactionTotal(post) : 0;
  const canInteract = isMember && post?.status === 'PUBLISHED';
  const canDelete = isMember && post?.status !== 'DELETED' && post?.userId === meQuery.data?.id;

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  const runReactPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.22, duration: 110, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, speed: 16, bounciness: 10, useNativeDriver: true }),
    ]).start();
  }, [heartScale]);

  useEffect(() => {
    const wasHearted = previousReactedCodeRef.current === true;
    if (previousReactedCodeRef.current !== undefined && !wasHearted && viewerHearted) {
      runReactPulse();
    }
    previousReactedCodeRef.current = viewerHearted;
  }, [viewerHearted, runReactPulse]);

  const togglePostReact = useMutation({
    mutationFn: (typeCode: string) => postsService.togglePostReaction(String(id), typeCode),
    onMutate: async (typeCode) => {
      const snapshot = optimisticTogglePostReaction(queryClient, String(id), typeCode);
      return { snapshot };
    },
    onSuccess: (r) => {
      applyPostPatch(queryClient, {
        postId: r.post.id,
        reactionCounts: r.post.reactionCounts,
        myReactionCodes: r.post.myReactionCodes,
        commentCount: r.post.commentCount,
        shareCount: r.post.shareCount,
      });
      setActionErr(null);
    },
    onError: (e, _vars, context) => {
      if (context?.snapshot) {
        applyPostPatch(queryClient, {
          postId: context.snapshot.id,
          reactionCounts: context.snapshot.reactionCounts,
          myReactionCodes: context.snapshot.myReactionCodes,
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['posts', id] });
      }
      setActionErr(formatApiError(e, t('postsReactionFailed')));
    },
  });

  const addCommentMut = useMutation({
    mutationFn: () =>
      postsService.addComment(String(id), {
        content: commentText.trim(),
        parentCommentId: replyTo?.id,
      }),
    onSuccess: async () => {
      const optimisticComment = {
        id: `local-${Date.now()}`,
        postId: String(id),
        displayName: resolvePublicDisplayName(
          meQuery.data?.profile?.displayName,
          meQuery.data?.profile?.username,
          'Bạn',
        ),
        content: commentText.trim(),
        parentCommentId: replyTo?.id ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      applyCommentCreated(queryClient, {
        postId: String(id),
        comment: optimisticComment,
        commentCount: (post?.commentCount ?? 0) + 1,
      });
      setCommentText('');
      setReplyTo(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', id, 'comments'] });
    },
    onError: (e) => {
      composerShakeRef.current?.shake();
      setActionErr(formatApiError(e, 'Không thể gửi bình luận.'));
    },
  });

  const deletePostMut = useMutation({
    mutationFn: () => postsService.deletePost(String(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.back();
    },
    onError: (e) => setActionErr(formatApiError(e, 'Không thể xóa bài viết.')),
  });

  const sharePostMut = useMutation({
    mutationFn: () => postsService.sharePost(String(id)),
    onSuccess: (result) => {
      applyPostPatch(queryClient, {
        postId: result.post.id,
        reactionCounts: result.post.reactionCounts,
        myReactionCodes: result.post.myReactionCodes,
        commentCount: result.post.commentCount,
        shareCount: result.post.shareCount,
      });
      setActionErr(null);
    },
    onError: (e) => setActionErr(formatApiError(e, 'Không thể chia sẻ bài viết.')),
  });

  if (!hasAccessToken) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('postsMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  if (postQuery.isError) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{formatApiError(postQuery.error, 'Không thể tải bài viết.')}</ThemedText>
      </ThemedView>
    );
  }

  if (postQuery.isLoading || !post) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const triggerHeartReact = () => {
    if (!canInteract) return;
    if (!viewerHearted) runReactPulse();
    togglePostReact.mutate('HEART');
  };

  const runDeferredPostAction = (action: () => void) => {
    if (mediaInteractingRef.current || Date.now() - lastMediaInteractionAt.current < 90) return;
    if (!canInteract) return;

    const now = Date.now();
    if (now - lastTapRef.current < SINGLE_TAP_DELAY_MS) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      triggerHeartReact();
      lastTapRef.current = 0;
      return;
    }

    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    singleTapTimeoutRef.current = setTimeout(() => {
      action();
      singleTapTimeoutRef.current = null;
    }, SINGLE_TAP_DELAY_MS);
    lastTapRef.current = now;
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96, paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={[styles.headerBlock, { borderColor: border }]}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.titleFlex}>{post.title}</ThemedText>
            {canDelete ? (
              <Pressable
                onPress={() => {
                  Alert.alert(t('postDeleteTitle'), t('postDeleteConfirm'), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('postDeleteAction'), style: 'destructive', onPress: () => deletePostMut.mutate() },
                  ]);
                }}
                style={styles.deleteBtn}
                disabled={deletePostMut.isPending}>
                <ThemedText style={styles.deleteTxt}>{t('postDeleteAction')}</ThemedText>
              </Pressable>
            ) : null}
          </View>
          {post.author ? (
            <ThemedText style={[styles.date, { color: muted }]}>
              {resolvePublicDisplayName(post.author.displayName, post.author.username)}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.date, { color: muted }]}>
            {formatLocalDateTime(post.createdAt)}
            {post.updatedAt !== post.createdAt ? ` · ${t('postUpdatedAt')} ${formatLocalDateTime(post.updatedAt)}` : ''}
          </ThemedText>
          {post.category || post.tags.length || post.location?.name ? (
            <View style={styles.metaChips}>
              {post.category ? (
                <View style={[styles.chip, { borderColor: border }]}>
                  <ThemedText style={styles.chipTxt}>{post.category}</ThemedText>
                </View>
              ) : null}
              {post.tags.map((tag) => (
                <View key={tag} style={[styles.chip, { borderColor: border }]}>
                  <ThemedText style={styles.chipTxt}>#{tag}</ThemedText>
                </View>
              ))}
              {typeof post.location?.name === 'string' && post.location.name ? (
                <View style={[styles.chip, { borderColor: border }]}>
                  <ThemedText style={styles.chipTxt}>{post.location.name}</ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
          <Pressable
            onPress={() => {
              runDeferredPostAction(() => {});
            }}>
            <PostMediaBlock
              media={post.media}
              slot="portrait"
              onInteractionStart={() => {
                mediaInteractingRef.current = true;
              }}
              onInteractionEnd={() => {
                mediaInteractingRef.current = false;
                lastMediaInteractionAt.current = Date.now();
              }}
              deferViewerOpen={runDeferredPostAction}
            />
            <View style={[styles.section, { borderColor: border }]}>
              <ThemedText style={{ color: text }}>
                {getPostBodyPlainText(post.contentHtml, post.tags)}
              </ThemedText>
            </View>
          </Pressable>
          {actionErr ? (
            <ThemedText lightColor="#b00" darkColor="#f88" style={styles.errTxt}>
              {actionErr}
            </ThemedText>
          ) : null}

          {canInteract && (reactorsQuery.data?.total ?? 0) > 0 ? (
            <View style={styles.reactorMetaRow}>
              <Pressable onPress={() => setShowReactors(true)} hitSlop={8}>
                <ThemedText style={[styles.reactorMeta, { color: muted }]}>
                  {reactorsQuery.data?.total ?? 0} người đã bày tỏ cảm xúc
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {canInteract ? (
            <View style={[styles.actionRow, { borderTopColor: border }]}>
              <Pressable
                onPress={triggerHeartReact}
                onLongPress={(e) => {
                  setPickerAnchor({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
                  setPickerOpen(true);
                }}
                delayLongPress={180}
                style={styles.actionBtn}>
                <Animated.View style={[styles.reactIconWrap, { transform: [{ scale: heartScale }] }]}>
                  <IconSymbol
                    name={viewerHearted ? 'heart.fill' : 'heart'}
                    size={17}
                    color={viewerHearted ? cta : muted}
                  />
                </Animated.View>
                <ThemedText style={styles.actionText}>{totalReacts}</ThemedText>
              </Pressable>
              <Pressable style={styles.actionBtn}>
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={17} color={muted} />
                <ThemedText style={styles.actionText}>{post.commentCount}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => sharePostMut.mutate()}
                disabled={sharePostMut.isPending}
                style={styles.actionBtn}>
                <IconSymbol name="paperplane.fill" size={17} color={muted} />
                <ThemedText style={styles.actionText}>{post.shareCount}</ThemedText>
              </Pressable>
            </View>
          ) : null}

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('postDetailComments')}
          </ThemedText>
          {!isMember ? (
            <ThemedText style={{ color: muted }}>{t('postsMemberRequired')}</ThemedText>
          ) : !canInteract ? (
            <ThemedText style={{ color: muted }}>{t('postDraftNoInteraction')}</ThemedText>
          ) : commentsQuery.isLoading ? (
            <ActivityIndicator />
          ) : commentsQuery.data?.pages[0]?.threaded?.length ? (
            <CommentThread
              threaded={commentsQuery.data.pages.flatMap((p) => p.threaded ?? [])}
              onReply={(c) => setReplyTo(c)}
            />
          ) : (
            <ThemedText style={{ color: muted }}>{t('postDetailNoComments')}</ThemedText>
          )}
        </View>
      </ScrollView>
      <ShakeView
        ref={composerShakeRef}
        style={[styles.composer, { borderTopColor: border, backgroundColor: bg, paddingBottom: insets.bottom, opacity: canInteract ? 1 : 0.5 }]}>
        {replyTo ? (
          <View style={styles.replyBanner}>
            <ThemedText style={{ color: muted }}>
              {t('postDetailReplying')} {replyTo.displayName}
            </ThemedText>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <ThemedText type="link">{t('cancel')}</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('postDetailCommentPlaceholder')}
            placeholderTextColor={muted}
            multiline
            onContentSizeChange={(event) => {
              const next = Math.min(Math.max(event.nativeEvent.contentSize.height, 42), 112);
              setCommentInputHeight(next);
            }}
            style={[styles.input, { borderColor: border, color: text, height: commentInputHeight }]}
          />
          <PressableScale
            onPress={() => addCommentMut.mutate()}
            disabled={addCommentMut.isPending || !commentText.trim() || !canInteract}
            style={[styles.sendBtn, { backgroundColor: cta }]}>
            {addCommentMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.sendTxt}>{t('postDetailSendComment')}</ThemedText>
            )}
          </PressableScale>
        </View>
      </ShakeView>
      <ReactionPicker
        open={pickerOpen}
        anchor={pickerAnchor}
        options={postTypes}
        selectedCode={reactedCode}
        onClose={() => setPickerOpen(false)}
        onSelect={(typeCode) => {
          if (!canInteract) return;
          setPickerOpen(false);
          togglePostReact.mutate(typeCode);
        }}
      />
      <Modal transparent visible={showReactors} animationType="fade" onRequestClose={() => setShowReactors(false)}>
        <Pressable style={styles.reactorsBackdrop} onPress={() => setShowReactors(false)}>
          <View style={[styles.reactorsSheet, { borderColor: border, backgroundColor: bg }]}>
            <ThemedText type="defaultSemiBold">Tương tác</ThemedText>
            {(reactorsQuery.data?.items ?? []).slice(0, 30).map((r, idx) => (
              <ThemedText key={`${r.displayName}-${r.reactionCode}-${idx}`} style={{ color: text }}>
                {r.displayName} · {r.reactionName}
              </ThemedText>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleFlex: { flex: 1 },
  deleteBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteTxt: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
  headerBlock: {
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  section: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  date: { fontSize: 12 },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTxt: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  actionRow: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reactIconWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  reactImage: { width: 18, height: 18, borderRadius: 9 },
  reactFallback: { fontSize: 16, lineHeight: 18 },
  reactorMetaRow: { alignItems: 'flex-end' },
  reactorMeta: { fontSize: 12, fontWeight: '600' },
  errTxt: { marginVertical: 6 },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  sendBtn: {
    marginLeft: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendTxt: { color: '#fff', fontWeight: '600' },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  reactorsBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.22)', justifyContent: 'center', padding: 20 },
  reactorsSheet: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
});
