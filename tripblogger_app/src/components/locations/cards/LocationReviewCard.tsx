import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LocationReviewDto } from '@/src/services/api/reviews.service';

type LocationReviewCardProps = {
  review: LocationReviewDto;
};

export function LocationReviewCard({ review }: LocationReviewCardProps) {
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const date = new Date(review.createdAt).toLocaleDateString();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {review.author.displayName}
        </ThemedText>
        <ThemedText style={{ color: tint, fontWeight: '700' }}>★{review.rating}</ThemedText>
      </View>
      <ThemedText style={{ color: muted, fontSize: 11 }}>{date}</ThemedText>
      {review.content ? (
        <ThemedText numberOfLines={3} style={{ marginTop: 6, lineHeight: 20 }}>
          {review.content}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
