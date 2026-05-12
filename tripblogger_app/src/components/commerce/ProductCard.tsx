import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ProductDto } from '@/src/types/commerce';
import { PriceLabel } from './PriceLabel';
import { ProductTypeBadge } from './ProductTypeBadge';
import { SellerBadge } from './SellerBadge';

export function ProductCard({
  product,
  onPress,
  borderColor,
  cardColor,
  tint,
  onRemoveFromWishlist,
  wishlistRemoveLabel,
}: {
  product: ProductDto;
  onPress: () => void;
  borderColor: string;
  cardColor: string;
  tint: string;
  /** When set, shows a heart control to remove from wishlist without opening detail */
  onRemoveFromWishlist?: () => void;
  wishlistRemoveLabel?: string;
}) {
  const cover = product.media?.[0]?.thumbnailUrl || product.media?.[0]?.url;
  return (
    <View style={[styles.card, { borderColor, backgroundColor: cardColor }]}>
      <Pressable onPress={onPress} style={styles.cardMain}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.img} contentFit="cover" />
        ) : (
          <View style={[styles.img, styles.placeholder]} />
        )}
        <View style={styles.body}>
          <ThemedText numberOfLines={2} type="defaultSemiBold">
            {product.title}
          </ThemedText>
          <SellerBadge name={product.seller.displayName} verified={product.seller.isVerifiedSeller} color={tint} />
          <View style={styles.row}>
            <PriceLabel amount={product.price} />
            <ProductTypeBadge type={product.productType} />
          </View>
        </View>
      </Pressable>
      {onRemoveFromWishlist ? (
        <Pressable
          accessibilityLabel={wishlistRemoveLabel}
          onPress={onRemoveFromWishlist}
          style={[styles.wishlistRm, { backgroundColor: cardColor, borderColor: borderColor }]}>
          <IconSymbol name="heart.fill" size={20} color={tint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  cardMain: { overflow: 'hidden' },
  wishlistRm: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', aspectRatio: 1, backgroundColor: '#2222' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: 10, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});
