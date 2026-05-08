import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import type { CommentDto, ReactionTypeDto } from '@/src/types/post';
import { formatApiError } from '@/src/utils/format-api-error';

function postReactionTypes(types: ReactionTypeDto[]): ReactionTypeDto[] {
  return types.filter((t) => t.useFor === 'POST' || t.useFor === 'BOTH');
}

function commentReactionTypes(types: ReactionTypeDto[]): ReactionTypeDto[] {
  return types.filter((t) => t.useFor === 'COMMENT' || t.useFor === 'BOTH');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const isMember = meQuery.data?.role === 'MEMBER';

  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
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
    enabled: Boolean(id) && isMember === true,
  });

  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [commentsQuery.data?.pages],
  );

  const post = postQuery.data;

  const postTypes = useMemo(
    () => postReactionTypes(typesQuery.data ?? []),
    [typesQuery.data],
  );
  const cmtTypes = useMemo(
    () => commentReactionTypes(typesQuery.data ?? []),
    [typesQuery.data],
  );

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const togglePostReact = useMutation({
    mutationFn: (typeId: string) => postsService.togglePostReaction(String(id), typeId),
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

  const toggleCommentReact = useMutation({
    mutationFn: ({ commentId, typeId }: { commentId: string; typeId: string }) =>
      postsService.toggleCommentReaction(String(id), commentId, typeId),
    onError: (e) => setActionErr(formatApiError(e)),
  });

  const renderComment = useCallback(
    ({ item }: { item: CommentDto }) => (
      <View
        style={[
          styles.commentRow,
          { borderColor: border, backgroundColor: card },
          item.parentCommentId ? styles.commentReply : null,
        ]}>
        <ThemedText style={{ fontSize: 13, color: muted }}>{item.userId.slice(0, 8)}…</ThemedText>
        <ThemedText>{item.content}</ThemedText>
        <View style={styles.commentActions}>
          <Pressable onPress={() => setReplyTo(item)}>
            <ThemedText type="link" style={{ fontSize: 13 }}>
              {t('postDetailReply')}
            </ThemedText>
          </Pressable>
          {isMember &&
            cmtTypes.map((rt) => (
              <Pressable
                key={rt.id}
                onPress={() => toggleCommentReact.mutate({ commentId: item.id, typeId: rt.id })}
                style={styles.reactChip}>
                <ThemedText>{rt.name}</ThemedText>
              </Pressable>
            ))}
        </View>
      </View>
    ),
    [border, card, muted, t, isMember, cmtTypes, toggleCommentReact],
  );

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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        renderItem={renderComment}
        onEndReached={() => {
          if (commentsQuery.hasNextPage && !commentsQuery.isFetchingNextPage) {
            void commentsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <ThemedText type="subtitle">{post.title}</ThemedText>
            <ThemedText style={[styles.date, { color: muted }]}>
              {new Date(post.createdAt).toLocaleString()} · {post.status}
            </ThemedText>
            <ThemedText style={{ color: text }}>{stripHtml(post.contentHtml)}</ThemedText>
            {actionErr ? (
              <ThemedText lightColor="#b00" darkColor="#f88" style={styles.errTxt}>
                {actionErr}
              </ThemedText>
            ) : null}
            <View style={styles.reactRow}>
              {postTypes
                .filter((rt) => rt.code !== 'SHARE')
                .map((rt) => {
                  const count = post.reactionCounts[rt.id] ?? 0;
                  const on = post.myReactionTypeIds.includes(rt.id);
                  return (
                    <Pressable
                      key={rt.id}
                      onPress={() => togglePostReact.mutate(rt.id)}
                      style={[
                        styles.reactChip,
                        on && { borderColor: cta, backgroundColor: card },
                      ]}>
                      <ThemedText style={{ fontSize: 13 }}>
                        {rt.name} {count > 0 ? `(${count})` : ''}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              <Pressable
                onPress={() => shareMut.mutate()}
                style={styles.reactChip}
                disabled={shareMut.isPending}>
                <ThemedText style={{ fontSize: 13 }}>{t('postDetailShare')}</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('postDetailComments')}
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          !commentsQuery.isLoading ? (
            <ThemedText style={{ color: muted, paddingHorizontal: 16 }}>{t('postDetailNoComments')}</ThemedText>
          ) : (
            <ActivityIndicator />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: 16 }}
      />
      <View style={[styles.composer, { borderTopColor: border, backgroundColor: bg, paddingBottom: insets.bottom + 8 }]}>
        {replyTo ? (
          <View style={styles.replyBanner}>
            <ThemedText style={{ color: muted }}>
              {t('postDetailReplying')} {replyTo.id.slice(0, 8)}…
            </ThemedText>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <ThemedText type="link">{t('cancel')}</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder={t('postDetailCommentPlaceholder')}
          placeholderTextColor={muted}
          multiline
          style={[styles.input, { borderColor: border, color: text }]}
        />
        <Pressable
          onPress={() => addCommentMut.mutate()}
          disabled={addCommentMut.isPending || !commentText.trim()}
          style={[styles.sendBtn, { backgroundColor: cta }]}>
          {addCommentMut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.sendTxt}>{t('postDetailSendComment')}</ThemedText>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerBlock: { gap: 10, paddingTop: 8 },
  date: { fontSize: 12 },
  sectionTitle: { marginTop: 16, marginBottom: 8 },
  reactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  reactChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: 'rgba(128,128,128,0.4)',
  },
  commentRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 4,
  },
  commentReply: { marginLeft: 16 },
  commentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  errTxt: { marginVertical: 6 },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  sendBtn: { marginTop: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  sendTxt: { color: '#fff', fontWeight: '600' },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});
