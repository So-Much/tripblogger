import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';
import type { ShopFilterValues, ShopSortBy } from './ShopFilterSheet';

/** Same options as ShopFilterSheet, exposed as horizontal chips (like home + sheet). */
export function ShopInlineFilterChips({
  value,
  onChange,
}: {
  value: ShopFilterValues;
  onChange: (next: ShopFilterValues) => void;
}) {
  const { t } = useI18n();
  const { border, card, cta, text, textMuted, primary, radius } = useCommerceTheme();

  const sortOptions: ShopSortBy[] = ['newest', 'popular', 'price_asc', 'price_desc'];
  const conditionOptions: { key: 'NEW' | 'SECONDHAND' | undefined; label: string }[] = [
    { key: undefined, label: t('shopFilterAllTypes') },
    { key: 'NEW', label: t('productNew') },
    { key: 'SECONDHAND', label: t('productSecondhand') },
  ];

  const chip = (on: boolean) => ({
    borderColor: on ? cta : border,
    backgroundColor: on ? primary : card,
    borderRadius: radius.pill,
  });

  return (
    <View style={styles.block}>
      <ThemedText style={[styles.label, { color: textMuted }]}>{t('shopFilterSort')}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {sortOptions.map((s) => {
          const on = value.sortBy === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange({ ...value, sortBy: s })}
              style={({ pressed }) => [styles.chip, chip(on), { opacity: pressed ? 0.9 : 1 }]}>
              <ThemedText style={{ color: on ? cta : text, fontWeight: on ? '700' : '500', fontSize: 13 }}>
                {t(`shopSort_${s}`)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ThemedText style={[styles.label, { color: textMuted, marginTop: 10 }]}>{t('shopFilterCondition')}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {conditionOptions.map((c) => {
          const on = value.productType === c.key;
          return (
            <Pressable
              key={c.key ?? 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange({ ...value, productType: c.key })}
              style={({ pressed }) => [styles.chip, chip(on), { opacity: pressed ? 0.9 : 1 }]}>
              <ThemedText style={{ color: on ? cta : text, fontWeight: on ? '700' : '500', fontSize: 13 }}>
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingBottom: 4 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: { paddingHorizontal: 14, gap: 8, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
