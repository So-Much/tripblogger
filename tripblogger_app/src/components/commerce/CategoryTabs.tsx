import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';
import type { CategoryDto } from '@/src/types/commerce';

const CATEGORY_ICONS: IconSymbolName[] = [
  'square.grid.2x2',
  'airplane',
  'bag.fill',
  'tag.fill',
  'storefront.fill',
  'location.fill',
];

function iconForCategory(index: number): IconSymbolName {
  return CATEGORY_ICONS[(index + 1) % CATEGORY_ICONS.length] ?? 'tag.fill';
}

type TabItem = { id: string | undefined; label: string; icon: IconSymbolName };

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

  const tabs: TabItem[] = [
    { id: undefined, label: t('shopAllProducts'), icon: 'square.grid.2x2' },
    ...categories.map((c, i) => ({
      id: c.id,
      label: c.name,
      icon: iconForCategory(i),
    })),
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
                  styles.tab,
                  {
                    borderColor: selected ? cta : border,
                    backgroundColor: selected ? primary : card,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: selected ? card : primary,
                      borderColor: selected ? cta : border,
                    },
                  ]}>
                  <IconSymbol name={tab.icon} size={20} color={selected ? cta : textMuted} />
                </View>
                <ThemedText
                  numberOfLines={2}
                  style={[styles.tabLabel, { color: selected ? cta : text, fontWeight: selected ? '700' : '500' }]}>
                  {tab.label}
                </ThemedText>
                {selected ? <View style={[styles.indicator, { backgroundColor: cta }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 4 },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  loader: { paddingVertical: 20 },
  scroll: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  tab: {
    width: 92,
    minHeight: 108,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    minHeight: 32,
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});
