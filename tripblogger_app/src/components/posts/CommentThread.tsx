import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { formatSocialTimestamp } from '@/src/utils/datetime';
import { resolvePublicDisplayName } from '@/src/utils/display-name';
import type { CommentDto, ThreadedCommentDto } from '@/src/types/post';

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
  const { t } = useI18n();
  const textMuted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const relative = formatSocialTimestamp(comment.createdAt, {
    now: t('timeRelativeNow'),
    minutes: (n) => t('timeRelativeMinutes', { count: n }),
    hours: (n) => t('timeRelativeHours', { count: n }),
    days: (n) => t('timeRelativeDays', { count: n }),
    weeks: (n) => t('timeRelativeWeeks', { count: n }),
    months: (n) => t('timeRelativeMonths', { count: n }),
    years: (n) => t('timeRelativeYears', { count: n }),
    localTime: (time) => t('timeLocalClock', { time }),
    yesterday: (time) => t('timeYesterday', { time }),
  });

  return (
    <View style={[styles.bubble, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.metaRow}>
        <ThemedText style={[styles.user, { color: textMuted }]}>
          {resolvePublicDisplayName(comment.displayName, null)}
        </ThemedText>
        <ThemedText style={[styles.time, { color: textMuted }]}>{relative}</ThemedText>
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

