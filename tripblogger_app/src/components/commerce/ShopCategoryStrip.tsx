import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';
import type { CategoryDto } from '@/src/types/commerce';

function iconForCategory(name: string): IconSymbolName {
  const n = name.toLowerCase();
  if (n.includes('photo') || n.includes('camera')) return 'camera.fill';
  if (n.includes('camp') || n.includes('outdoor')) return 'airplane';
  if (n.includes('shop') || n.includes('gear')) return 'bag.fill';
  return 'tag.fill';
}

export function ShopCategoryStrip({
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

  const tabs: { id: string | undefined; label: string; icon: IconSymbolName }[] = [
    { id: undefined, label: t('shopAllProducts'), icon: 'square.grid.2x2' },
    ...categories.map((c) => ({ id: c.id, label: c.name, icon: iconForCategory(c.name) })),
  ];

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  return (
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
              styles.item,
              {
                borderColor: selected ? cta : border,
                backgroundColor: selected ? primary : card,
                borderRadius: radius.md,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: selected ? `${cta}18` : `${textMuted}12` }]}>
              <IconSymbol name={tab.icon} size={18} color={selected ? cta : textMuted} />
            </View>
            <ThemedText
              numberOfLines={2}
              style={[styles.label, { color: selected ? cta : text, fontWeight: selected ? '700' : '500' }]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: 12, marginHorizontal: 16 },
  scroll: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  item: {
    width: 68,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    minHeight: 24,
  },
});
