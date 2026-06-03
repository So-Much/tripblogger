import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

type ReviewFiltersProps = {
  sort: 'recent' | 'rating';
  onChange: (sort: 'recent' | 'rating') => void;
};

export function ReviewFilters({ sort, onChange }: ReviewFiltersProps) {
  const { t } = useI18n();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');

  const options: { key: 'recent' | 'rating'; label: string }[] = [
    { key: 'recent', label: t('locationReviewSortRecent') },
    { key: 'rating', label: t('locationReviewSortRating') },
  ];

  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = sort === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              { borderColor: active ? tint : border },
              active && { backgroundColor: `${tint}14` },
            ]}>
            <ThemedText style={{ color: active ? tint : muted, fontSize: 12, fontWeight: '700' }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});
