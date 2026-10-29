import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

type Props = {
  rating: number | null | undefined;
  reviewCount?: number | null;
  size?: 'sm' | 'md';
};

/** Compact "★ 4.5 (12)" — hidden when no real rating data. */
export function PlaceRatingLabel({ rating, reviewCount, size = 'sm' }: Props) {
  const { t } = useI18n();
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  if (rating == null || !(rating > 0)) return null;

  const ratingText = rating.toFixed(1);
  const count = reviewCount != null && reviewCount > 0 ? reviewCount : null;
  const label =
    count != null
      ? t('mapPlaceRatingWithCount', { rating: ratingText, count })
      : t('mapPlaceRating', { rating: ratingText });

  const fontSize = size === 'md' ? 13 : 12;
  const iconSize = size === 'md' ? 14 : 12;

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={
        count != null
          ? t('mapPlaceRatingA11yWithCount', { rating: ratingText, count })
          : t('mapPlaceRatingA11y', { rating: ratingText })
      }>
      <MaterialIcons name="star" size={iconSize} color={tint} />
      <Text style={[styles.text, { color: muted, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  text: { fontWeight: '600' },
});
