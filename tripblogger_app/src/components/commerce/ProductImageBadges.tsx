import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/friendly-commerce';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';
import type { ProductType } from '@/src/types/commerce';

/** Stacked badges at top-left of product image (primary visual scan path). */
export function ProductImageBadges({
  productType,
  showLowStock,
  lowStockLabel,
}: {
  productType: ProductType;
  showLowStock?: boolean;
  lowStockLabel?: string;
}) {
  const { t } = useI18n();
  const { success, warning, cta, radius } = useCommerceTheme();
  const isNew = productType === 'NEW';

  return (
    <View style={styles.stack} pointerEvents="none">
      <View
        style={[
          styles.badge,
          {
            borderRadius: radius.sm,
            backgroundColor: isNew ? withAlpha(success, 0.92) : withAlpha(warning, 0.92),
          },
        ]}>
        <ThemedText style={styles.badgeTxt}>{isNew ? t('productNew') : t('productSecondhand')}</ThemedText>
      </View>
      {showLowStock && lowStockLabel ? (
        <View style={[styles.badge, { borderRadius: radius.sm, backgroundColor: withAlpha(cta, 0.9) }]}>
          <ThemedText style={styles.badgeTxt} numberOfLines={1}>
            {lowStockLabel}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    gap: 6,
    maxWidth: '72%',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeTxt: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
