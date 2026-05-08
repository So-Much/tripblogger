import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { CommentDto, ThreadedCommentDto } from '@/src/types/post';

function formatRelativeMinutes(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (ms < 60000) return 'Bây giờ';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}th`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

export function CommentThread({
  threaded,
  onReply,
}: {
  threaded: ThreadedCommentDto[];
  onReply: (comment: CommentDto) => void;
}) {
  const border = useThemeColor({}, 'border');
  return (
    <View style={styles.wrap}>
      {threaded.map((root) => (
        <View key={root.id} style={styles.root}>
          <CommentBubble comment={root} onReply={onReply} />
          {root.replies.map((r) => (
            <View key={r.id} style={[styles.reply, { borderLeftColor: border }]}>
              <CommentBubble comment={r} onReply={onReply} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function CommentBubble({ comment, onReply }: { comment: CommentDto; onReply: (comment: CommentDto) => void }) {
  const textMuted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  return (
    <View style={[styles.bubble, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.metaRow}>
        <ThemedText style={[styles.user, { color: textMuted }]}>{comment.displayName}</ThemedText>
        <ThemedText style={[styles.time, { color: textMuted }]}>{formatRelativeMinutes(comment.createdAt)}</ThemedText>
      </View>
      <ThemedText>{comment.content}</ThemedText>
      <Pressable onPress={() => onReply(comment)}>
        <ThemedText type="link" style={styles.replyLink}>
          Trả lời
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  root: { gap: 8 },
  reply: { marginLeft: 24, paddingLeft: 10, borderLeftWidth: 1 },
  bubble: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  user: { fontSize: 12, opacity: 0.95 },
  time: { fontSize: 11, opacity: 0.9 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyLink: { fontSize: 13 },
});

