import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PostMediaBlock } from './PostMediaBlock';
import type { PostDto, ReactionTypeDto } from '@/src/types/post';

function previewFromHtml(html: string, max = 160): string {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
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

export function PostPreviewCard({
  post,
  onPress,
  onDoubleTapHeart,
  onOpenReactionPicker,
  reactionTypes,
  cardColor,
  borderColor,
  mutedColor,
}: {
  post: PostDto;
  onPress: () => void;
  onDoubleTapHeart: () => void;
  onOpenReactionPicker: (anchor: { x: number; y: number }) => void;
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
  const totalReacts = Object.values(post.reactionCounts ?? {}).reduce((acc, c) => acc + c, 0) - post.shareCount;
  const reactedCode = useMemo(() => post.myReactionCodes.find((code) => code !== 'SHARE') ?? null, [post.myReactionCodes]);
  const reactedType = useMemo(
    () => (reactedCode ? reactionTypes.find((item) => item.code === reactedCode) ?? null : null),
    [reactedCode, reactionTypes],
  );
  const heartScale = useRef(new Animated.Value(1)).current;

  const runHeartPulse = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.22, duration: 110, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, speed: 16, bounciness: 10, useNativeDriver: true }),
    ]).start();
  };

  const triggerReact = () => {
    runHeartPulse();
    onDoubleTapHeart();
  };

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
      <Pressable
        onPress={() => {
          if (mediaInteractingRef.current || Date.now() - lastMediaInteractionAt.current < 90) return;
          const now = Date.now();
          if (canInteract && now - lastTapAt.current < 280) {
            if (singleTapTimeoutRef.current) {
              clearTimeout(singleTapTimeoutRef.current);
              singleTapTimeoutRef.current = null;
            }
            triggerReact();
          } else if (!canInteract) {
            if (now - lastTapAt.current > 260) onPress();
          } else {
            singleTapTimeoutRef.current = setTimeout(() => {
              onPress();
              singleTapTimeoutRef.current = null;
            }, 260);
          }
          lastTapAt.current = now;
        }}
        style={styles.contentPress}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {post.title}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: mutedColor }]}>
          {formatDateTime(post.createdAt)}
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
        />
        <ThemedText style={{ color: mutedColor }} numberOfLines={2}>
          {previewFromHtml(post.contentHtml)}
        </ThemedText>
      </Pressable>

      {canInteract ? (
        <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={triggerReact}
            onLongPress={(e) => onOpenReactionPicker({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
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
          <Pressable onPress={onPress} style={styles.actionBtn}>
            <IconSymbol name="bubble.left.and.bubble.right.fill" size={16} color={mutedColor} />
            <ThemedText style={styles.actionText}>{post.commentCount}</ThemedText>
          </Pressable>
          <Pressable onPress={onPress} style={styles.actionBtn}>
            <IconSymbol name="paperplane.fill" size={16} color={mutedColor} />
            <ThemedText style={styles.actionText}>{post.shareCount}</ThemedText>
          </Pressable>
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

