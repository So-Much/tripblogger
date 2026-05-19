import { Image } from 'expo-image';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';
import type { ProductDto } from '@/src/types/commerce';
import { PriceLabel } from './PriceLabel';
import { ProductTypeBadge } from './ProductTypeBadge';
import { SellerBadge } from './SellerBadge';

function ProductCardInner({
  product,
  onPress,
  onLongPress,
  borderColor,
  cardColor,
  tint,
  onRemoveFromWishlist,
  wishlistRemoveLabel,
}: {
  product: ProductDto;
  onPress: () => void;
  onLongPress?: () => void;
  borderColor: string;
  cardColor: string;
  tint: string;
  onRemoveFromWishlist?: () => void;
  wishlistRemoveLabel?: string;
}) {
  const { t } = useI18n();
  const cover = product.media?.[0]?.thumbnailUrl || product.media?.[0]?.url;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor,
          backgroundColor: cardColor,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.07,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
          }),
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={product.title}
        accessibilityHint={t('productCardA11yHint')}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.cardMain}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.img} contentFit="cover" cachePolicy="disk" transition={120} />
        ) : (
          <View style={[styles.img, styles.placeholder]} />
        )}
        <View style={styles.body}>
          <ThemedText numberOfLines={2} type="defaultSemiBold" style={styles.productTitle}>
            {product.title}
          </ThemedText>
          <SellerBadge name={product.seller.displayName} verified={product.seller.isVerifiedSeller} color={tint} />
          <View style={styles.row}>
            <PriceLabel amount={product.price} />
            <ProductTypeBadge type={product.productType} />
          </View>
          {lowStock ? (
            <ThemedText style={[styles.stockHint, { color: tint }]} numberOfLines={1}>
              {t('productLowStockLine', { count: product.stock, unit: product.stockUnit })}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      {onRemoveFromWishlist ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={wishlistRemoveLabel}
          onPress={onRemoveFromWishlist}
          style={[styles.wishlistRm, { backgroundColor: cardColor, borderColor }]}>
          <IconSymbol name="heart.fill" size={20} color={tint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export const ProductCard = memo(ProductCardInner);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  cardMain: { overflow: 'hidden' },
  wishlistRm: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', aspectRatio: 1, backgroundColor: '#0f172a12' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: 12, gap: 4 },
  productTitle: { lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  stockHint: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
