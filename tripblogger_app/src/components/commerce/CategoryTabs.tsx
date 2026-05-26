import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';
import type { CategoryDto } from '@/src/types/commerce';

/**
 * Horizontal category chips — same visual language as home commerce row / shop filter pills.
 * No cart/bag icons on categories (avoids looking like "orders" or checkout).
 */
export function CategoryTabs({
  categories,
  selectedId,
  onSelect,
  isLoading,
}: {
  categories: CategoryDto[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  isLoading?: boolean;
}) {
  const { t } = useI18n();
  const { border, card, cta, text, textMuted, primary, radius } = useCommerceTheme();

  const tabs: { id: string | undefined; label: string }[] = [
    { id: undefined, label: t('shopAllProducts') },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.heading, { color: textMuted }]}>{t('shopCategories')}</ThemedText>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          accessibilityRole="tablist">
          {tabs.map((tab) => {
            const selected = selectedId === tab.id;
            return (
              <Pressable
                key={tab.id ?? 'all'}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => onSelect(tab.id)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: selected ? cta : border,
                    backgroundColor: selected ? primary : card,
                    borderRadius: radius.pill,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <ThemedText
                  numberOfLines={1}
                  style={{
                    color: selected ? cta : text,
                    fontWeight: selected ? '700' : '500',
                    fontSize: 13,
                  }}>
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 6 },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loader: { paddingVertical: 16 },
  scroll: { paddingHorizontal: 14, gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    maxWidth: 220,
  },
});
