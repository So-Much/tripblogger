import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type ReviewTagCloudProps = {
  tags: { tag: string; count: number }[];
};

export function ReviewTagCloud({ tags }: ReviewTagCloudProps) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');

  if (!tags.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tags.map((t) => (
        <Pressable key={t.tag} style={[styles.chip, { borderColor: border }]} disabled>
          <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>#{t.tag}</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 11 }}>{t.count}</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});
