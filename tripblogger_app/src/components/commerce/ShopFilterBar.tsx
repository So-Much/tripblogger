import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';

export function ShopFilterBar({
  resultCount,
  activeFilterCount,
  onOpenFilters,
}: {
  resultCount: number;
  activeFilterCount: number;
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  const { border, card, cta, textMuted, onCta, radius } = useCommerceTheme();

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.count, { color: textMuted }]}>
        {t('shopResultCount', { count: resultCount })}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('shopFilter')}
        onPress={onOpenFilters}
        style={({ pressed }) => [
          styles.filterBtn,
          {
            borderColor: border,
            backgroundColor: card,
            borderRadius: radius.pill,
            opacity: pressed ? 0.88 : 1,
          },
        ]}>
        <IconSymbol name="slider.horizontal.3" size={18} color={cta} />
        <ThemedText type="defaultSemiBold" style={{ color: cta }}>
          {t('shopFilter')}
        </ThemedText>
        {activeFilterCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: cta }]}>
            <ThemedText style={[styles.badgeTxt, { color: onCta }]}>{String(activeFilterCount)}</ThemedText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  count: { fontSize: 14, flex: 1 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
});
