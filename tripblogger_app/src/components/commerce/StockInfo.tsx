import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';

export function StockInfo({ stock, unit }: { stock: number; unit: string }) {
  const { t } = useI18n();
  const { textMuted, danger, warning } = useCommerceTheme();

  if (stock <= 0) {
    return <ThemedText style={[styles.line, { color: danger }]}>{t('productOutOfStock')}</ThemedText>;
  }

  const low = stock <= 5;
  return (
    <ThemedText style={[styles.line, { color: low ? warning : textMuted, fontWeight: low ? '600' : '400' }]}>
      {t('productInStock')}: {stock} {unit}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 13 },
});
