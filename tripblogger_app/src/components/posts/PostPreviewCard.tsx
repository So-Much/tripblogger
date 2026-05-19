import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PostMediaBlock } from './PostMediaBlock';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { formatLocalDateTime } from '@/src/utils/datetime';
import { getPostBodyPlainText } from '@/src/utils/post-hashtag-content';
import { resolvePublicDisplayName } from '@/src/utils/display-name';
import type { PostDto, ReactionTypeDto } from '@/src/types/post';

const SINGLE_TAP_DELAY_MS = 240;

function previewFromHtml(html: string, tags: string[], max = 160): string {
  const t = getPostBodyPlainText(html, tags);
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function PostPreviewCard({
  post,
  onPress,
  onDoubleTapHeart,
  onOpenReactionPicker,
  onShare,
  reactionTypes,
  cardColor,
  borderColor,
  mutedColor,
}: {
  post: PostDto;
  onPress: () => void;
  onDoubleTapHeart: () => void;
  onOpenReactionPicker: (anchor: { x: number; y: number }) => void;
  onShare?: () => void;
  reactionTypes: ReactionTypeDto[];
  cardColor: string;
  borderColor: string;
  mutedColor: string;
}) {
  const lastTapAt = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaInteractingRef = useRef(false);
  const lastMediaInteractionAt = useRef(0);
  const canInteract = post.status === 'PUBLISHED';
  const totalReacts = Object.entries(post.reactionCounts ?? {}).reduce(
    (acc, [code, count]) => acc + (code === 'SHARE' ? 0 : count),
    0,
  );
  const reactedCode = useMemo(() => post.myReactionCodes.find((code) => code !== 'SHARE') ?? null, [post.myReactionCodes]);
  const reactedType = useMemo(
    () => (reactedCode ? reactionTypes.find((item) => item.code === reactedCode) ?? null : null),
    [reactedCode, reactionTypes],
  );
  const heartScale = useRef(new Animated.Value(1)).current;
  const previousReactedCodeRef = useRef<string | null | undefined>(undefined);

  const runHeartPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.22, duration: 110, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, speed: 16, bounciness: 10, useNativeDriver: true }),
    ]).start();
  }, [heartScale]);

  const triggerReact = () => {
    runHeartPulse();
    onDoubleTapHeart();
  };

  const runDeferredPostAction = (action: () => void) => {
    if (mediaInteractingRef.current || Date.now() - lastMediaInteractionAt.current < 90) return;

    const now = Date.now();
    if (canInteract && now - lastTapAt.current < SINGLE_TAP_DELAY_MS) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      triggerReact();
      lastTapAt.current = 0;
      return;
    }

    if (!canInteract) {
      action();
      lastTapAt.current = now;
      return;
    }

    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    singleTapTimeoutRef.current = setTimeout(() => {
      action();
      singleTapTimeoutRef.current = null;
    }, SINGLE_TAP_DELAY_MS);
    lastTapAt.current = now;
  };

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (previousReactedCodeRef.current !== undefined && previousReactedCodeRef.current !== reactedCode && reactedCode) {
      runHeartPulse();
    }
    previousReactedCodeRef.current = reactedCode;
  }, [reactedCode, runHeartPulse]);

  return (
    <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
      <Pressable
        onPress={() => {
          runDeferredPostAction(onPress);
        }}
        style={styles.contentPress}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {post.title}
        </ThemedText>
        {post.author ? (
          <ThemedText style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
            {resolvePublicDisplayName(post.author.displayName, post.author.username)}
            {post.category ? ` · ${post.category}` : ''}
          </ThemedText>
        ) : post.category ? (
          <ThemedText style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
            {post.category}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.meta, { color: mutedColor }]}>
          {formatLocalDateTime(post.createdAt)}
        </ThemedText>
        <PostMediaBlock
          media={post.media}
          slot="square"
          onInteractionStart={() => {
            mediaInteractingRef.current = true;
          }}
          onInteractionEnd={() => {
            mediaInteractingRef.current = false;
            lastMediaInteractionAt.current = Date.now();
          }}
          deferViewerOpen={runDeferredPostAction}
        />
        <ThemedText style={{ color: mutedColor }} numberOfLines={2}>
          {previewFromHtml(post.contentHtml, post.tags)}
        </ThemedText>
      </Pressable>

      {canInteract ? (
        <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={triggerReact}
            onLongPress={(e) => onOpenReactionPicker({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
            delayLongPress={180}
            style={styles.actionBtn}>
            <Animated.View style={[styles.reactIconWrap, { transform: [{ scale: heartScale }] }]}>
              {reactedType?.media?.startsWith('http') ? (
                <Image source={{ uri: reactedType.media }} style={styles.reactImage} />
              ) : reactedType?.media ? (
                <ThemedText style={styles.reactFallback}>{reactedType.media}</ThemedText>
              ) : (
                <IconSymbol name={reactedCode ? 'heart.fill' : 'heart'} size={16} color={reactedCode ? '#2563EB' : mutedColor} />
              )}
            </Animated.View>
            <ThemedText style={styles.actionText}>{Math.max(totalReacts, 0)}</ThemedText>
          </Pressable>
          <Pressable onPress={() => runDeferredPostAction(onPress)} style={styles.actionBtn}>
            <IconSymbol name="bubble.left.and.bubble.right.fill" size={16} color={mutedColor} />
            <ThemedText style={styles.actionText}>{post.commentCount}</ThemedText>
          </Pressable>
          <PressableScale
            onPress={() => onShare?.()}
            disabled={!onShare}
            style={[styles.actionBtn, !onShare ? styles.actionBtnDisabled : null]}>
            <IconSymbol name="paperplane.fill" size={16} color={mutedColor} />
            <ThemedText style={styles.actionText}>{post.shareCount}</ThemedText>
          </PressableScale>
        </View>
      ) : (
        <View style={[styles.draftHintRow, { borderTopColor: borderColor }]}>
          <ThemedText style={[styles.meta, { color: mutedColor }]}>Draft - chạm để chỉnh sửa</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  contentPress: { padding: 14, gap: 8 },
  meta: { fontSize: 12, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 2 },
  actionBtnDisabled: { opacity: 0.55 },
  actionText: { fontSize: 12, fontWeight: '600' },
  reactIconWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  reactImage: { width: 18, height: 18, borderRadius: 9 },
  reactFallback: { fontSize: 15, lineHeight: 18 },
  draftHintRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

