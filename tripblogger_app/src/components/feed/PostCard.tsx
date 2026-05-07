import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SectionCard } from '@/src/components/SectionCard';
import { FeedPost } from '@/src/types/feed';

interface PostCardProps {
  post: FeedPost;
}

function authorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PostCard({ post }: PostCardProps) {
  const muted = useThemeColor({}, 'textMuted');
  const accent = useThemeColor({}, 'accent');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const initials = authorInitials(post.authorName);

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: surface, borderColor: accent }]}>
            <ThemedText type="defaultSemiBold" style={{ color: accent }}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.headerText}>
            <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
            <ThemedText style={{ color: muted }}>
              {post.authorHandle} · {post.location}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <ThemedText style={{ color: muted }}>{post.createdAtLabel}</ThemedText>
          <Pressable hitSlop={12} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <IconSymbol size={22} name="ellipsis" color={muted} />
          </Pressable>
        </View>
      </View>

      <ThemedText style={styles.caption}>{post.caption}</ThemedText>
      <View style={[styles.mediaPlaceholder, { borderColor: accent }]}>
        <ThemedText style={{ color: accent }} type="defaultSemiBold">
          Media Preview
        </ThemedText>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.iconTap} hitSlop={10}>
          <IconSymbol size={22} name="heart.fill" color={accent} />
        </Pressable>
        <Pressable style={styles.iconTap} hitSlop={10}>
          <IconSymbol size={22} name="bubble.left.and.bubble.right.fill" color={accent} />
        </Pressable>
        <Pressable style={styles.iconTap} hitSlop={10}>
          <IconSymbol size={22} name="paperplane.fill" color={accent} />
        </Pressable>
      </View>

      <View style={[styles.statsRow, { borderTopColor: border }]}>
        <ThemedText style={{ color: muted }}>{post.likes} likes</ThemedText>
        <ThemedText style={{ color: muted }}>{post.comments} comments</ThemedText>
        <ThemedText style={{ color: muted }}>{post.shares} shares</ThemedText>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    minWidth: 0,
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headerRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginTop: -2,
  },
  caption: {
    marginTop: 10,
  },
  mediaPlaceholder: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    minHeight: 140,
    justifyContent: 'center',
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  iconTap: {
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
  },
});
