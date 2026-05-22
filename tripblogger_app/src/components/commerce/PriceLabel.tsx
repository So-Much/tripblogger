import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FriendlyType } from '@/constants/friendly-commerce';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';

export function PriceLabel({ amount, accent }: { amount: number; accent?: boolean }) {
  const { text, cta } = useCommerceTheme();
  const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <ThemedText style={[styles.price, { color: accent ? cta : text }]} accessibilityLabel={formatted}>
      {formatted}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  price: {
    fontSize: FriendlyType.title,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
