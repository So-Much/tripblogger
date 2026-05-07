import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommerceDeal } from '@/src/types/commerce';
import { DealCard } from './DealCard';

interface CommerceWidgetRowProps {
  deals: CommerceDeal[];
}

export function CommerceWidgetRow({ deals }: CommerceWidgetRowProps) {
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText type="subtitle">Deals gợi ý</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13, marginTop: 2 }}>Flash sale · Mall · Freeship</ThemedText>
        </View>
        <Pressable hitSlop={10} style={({ pressed }) => [pressed && { opacity: 0.75 }]}>
          <ThemedText type="defaultSemiBold" style={{ color: cta }}>
            Xem thêm
          </ThemedText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  row: {
    gap: 10,
    paddingRight: 6,
  },
});
