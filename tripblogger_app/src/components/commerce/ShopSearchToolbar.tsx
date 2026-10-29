import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';

export function ShopSearchToolbar({
  query,
  onChangeQuery,
  activeFilterCount,
  onOpenFilters,
}: {
  query: string;
  onChangeQuery: (q: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  const { border, card, cta, onCta, radius } = useCommerceTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.searchWrap, { borderColor: border, backgroundColor: card, borderRadius: radius.pill }]}>
        <IconSymbol name="magnifyingglass" size={18} color={cta} />
        <ThemedTextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder={t('shopSearchPlaceholder')}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onChangeQuery('')} hitSlop={8} accessibilityRole="button">
            <IconSymbol name="xmark.circle.fill" size={18} color={cta} />
          </Pressable>
        ) : null}
      </View>
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
        <IconSymbol name="slider.horizontal.3" size={20} color={cta} />
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
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
});
