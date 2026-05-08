import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { CommentDto, ReactionTypeDto } from '@/src/types/post';
import { formatApiError } from '@/src/utils/format-api-error';
import { PostMediaBlock } from '@/src/components/posts/PostMediaBlock';
import { ReactionPicker } from '@/src/components/posts/ReactionPicker';
import { CommentThread } from '@/src/components/posts/CommentThread';

function postReactionTypes(types: ReactionTypeDto[]): ReactionTypeDto[] {
  return types.filter((t) => t.useFor === 'POST' || t.useFor === 'BOTH');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
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
    enabled: Boolean(id) && isMember === true,
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
  const lastTapRef = useRef(0);
  const totalReacts = Math.max(
    Object.values(post?.reactionCounts ?? {}).reduce((acc, c) => acc + c, 0) - (post?.shareCount ?? 0),
    0,
  );
  const canInteract = post?.status === 'PUBLISHED';
  const canDelete = post?.status !== 'DELETED' && post?.userId === meQuery.data?.id;

  const togglePostReact = useMutation({
    mutationFn: (typeCode: string) => postsService.togglePostReaction(String(id), typeCode),
    onSuccess: (r) => {
      queryClient.setQueryData(['posts', id], r.post);
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      setActionErr(null);
    },
    onError: (e) => setActionErr(formatApiError(e)),
  });

  const shareMut = useMutation({
    mutationFn: () => postsService.sharePost(String(id)),
    onSuccess: (r) => {
      queryClient.setQueryData(['posts', id], r.post);
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      setActionErr(null);
    },
    onError: (e) => setActionErr(formatApiError(e)),
  });

  const addCommentMut = useMutation({
    mutationFn: () =>
      postsService.addComment(String(id), {
        content: commentText.trim(),
        parentCommentId: replyTo?.id,
      }),
    onSuccess: async () => {
      setCommentText('');
      setReplyTo(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', id, 'comments'] });
    },
    onError: (e) => setActionErr(formatApiError(e)),
  });

  const deletePostMut = useMutation({
    mutationFn: () => postsService.deletePost(String(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.back();
    },
    onError: (e) => setActionErr(formatApiError(e)),
  });

  if (!isMember) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('postsMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  if (postQuery.isError) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{formatApiError(postQuery.error)}</ThemedText>
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

  const handleDoubleTapHeart = async () => {
    await postsService.heartPost(String(id));
    await queryClient.invalidateQueries({ queryKey: ['posts', id] });
    await queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
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
          <ThemedText style={[styles.date, { color: muted }]}>{formatDateTime(post.createdAt)}</ThemedText>
          <Pressable
            onPress={() => {
              if (!canInteract) return;
              const now = Date.now();
              if (now - lastTapRef.current < 280) {
                void handleDoubleTapHeart();
              }
              lastTapRef.current = now;
            }}>
            <PostMediaBlock media={post.media} />
            <View style={[styles.section, { borderColor: border }]}>
              <ThemedText style={{ color: text }}>{stripHtml(post.contentHtml)}</ThemedText>
            </View>
          </Pressable>
          {actionErr ? (
            <ThemedText lightColor="#b00" darkColor="#f88" style={styles.errTxt}>
              {actionErr}
            </ThemedText>
          ) : null}

          {canInteract ? (
            <View style={styles.reactorMetaRow}>
              <Pressable onPress={() => setShowReactors(true)} hitSlop={8}>
                <ThemedText style={[styles.reactorMeta, { color: muted }]}>
                  {reactorsQuery.data?.total ?? 0} người đã tương tác
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {canInteract ? (
            <View style={[styles.actionRow, { borderTopColor: border }]}>
              <Pressable
                onPress={() => void handleDoubleTapHeart()}
                onLongPress={(e) => {
                  setPickerAnchor({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
                  setPickerOpen(true);
                }}
                style={styles.actionBtn}>
                <IconSymbol name="heart.fill" size={17} color={cta} />
                <ThemedText style={styles.actionText}>{totalReacts}</ThemedText>
              </Pressable>
              <Pressable style={styles.actionBtn}>
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={17} color={muted} />
                <ThemedText style={styles.actionText}>{post.commentCount}</ThemedText>
              </Pressable>
              <Pressable onPress={() => shareMut.mutate()} style={styles.actionBtn} disabled={shareMut.isPending}>
                <IconSymbol name="paperplane.fill" size={17} color={muted} />
                <ThemedText style={styles.actionText}>{post.shareCount}</ThemedText>
              </Pressable>
            </View>
          ) : null}

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('postDetailComments')}
          </ThemedText>
          {!canInteract ? (
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
      <View style={[styles.composer, { borderTopColor: border, backgroundColor: bg, paddingBottom: insets.bottom, opacity: canInteract ? 1 : 0.5 }]}>
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
          <Pressable
            onPress={() => addCommentMut.mutate()}
            disabled={addCommentMut.isPending || !commentText.trim() || !canInteract}
            style={[styles.sendBtn, { backgroundColor: cta }]}>
            {addCommentMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.sendTxt}>{t('postDetailSendComment')}</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
      <ReactionPicker
        open={pickerOpen}
        anchor={pickerAnchor}
        options={postTypes.filter((r) => r.code !== 'SHARE')}
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
