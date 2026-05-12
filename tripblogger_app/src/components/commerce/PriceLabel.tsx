import { ThemedText } from '@/components/themed-text';

export function PriceLabel({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  return <ThemedText type="defaultSemiBold">{formatted}</ThemedText>;
}
