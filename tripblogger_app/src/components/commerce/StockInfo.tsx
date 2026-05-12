import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/src/i18n';

export function StockInfo({ stock, unit }: { stock: number; unit: string }) {
  const { t } = useI18n();
  if (stock <= 0) return <ThemedText style={{ opacity: 0.7 }}>{t('productOutOfStock')}</ThemedText>;
  return (
    <ThemedText style={{ opacity: 0.8, fontSize: 13 }}>
      {t('productInStock')}: {stock} {unit}
    </ThemedText>
  );
}
