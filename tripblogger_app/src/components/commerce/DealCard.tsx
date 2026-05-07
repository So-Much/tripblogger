import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommerceDeal } from '@/src/types/commerce';

interface DealCardProps {
  deal: CommerceDeal;
}

export function DealCard({ deal }: DealCardProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <Pressable
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: card, borderColor: border },
        pressed && styles.cardPressed,
      ]}
    >
      <ThemedText style={[styles.badge, { color: cta }]}>{deal.badge}</ThemedText>
      <ThemedText type="defaultSemiBold">{deal.title}</ThemedText>
      <ThemedText style={{ color: muted }}>{deal.shopName}</ThemedText>
      <View style={styles.footer}>
        <ThemedText type="defaultSemiBold">{deal.priceLabel}</ThemedText>
        <ThemedText style={{ color: muted }}>{deal.soldLabel}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 12,
    width: 210,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    marginTop: 6,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.988 }],
  },
});
