import { Image } from 'expo-image';
import { memo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { withAlpha } from '@/constants/friendly-commerce';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import type { ProductQuickAction } from '@/src/hooks/use-product-quick-actions';
import { useI18n } from '@/src/i18n';
import type { ProductDto } from '@/src/types/commerce';
import { PriceLabel } from './PriceLabel';
import { ProductImageBadges } from './ProductImageBadges';
import { SellerBadge } from './SellerBadge';

/** Fixed action rail — prevents layout shift when loading (ui-ux-pro-max: stable hover/loading). */
const ACTION_ROW_H = 38;
const ICON_BTN = 36;
const ICON_GLYPH = 17;

function IconActionBtn({
  label,
  icon,
  filled,
  onPress,
  disabled,
  pending,
  borderColor,
  cta,
  card,
  radius,
  style,
  inCartQty,
  a11yHint,
}: {
  label: string;
  icon: 'cart.fill' | 'heart' | 'heart.fill';
  filled?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  pending?: boolean;
  borderColor: string;
  cta: string;
  card: string;
  radius: { md: number };
  style?: StyleProp<ViewStyle>;
  inCartQty?: number;
  a11yHint?: string;
}) {
  const showBadge = typeof inCartQty === 'number' && inCartQty > 0 && !pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={a11yHint}
      accessibilityState={{ disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          borderColor: filled ? cta : borderColor,
          backgroundColor: filled ? withAlpha(cta, 0.1) : card,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
        style,
      ]}>
      <View style={styles.iconBtnInner}>
        <IconSymbol name={icon} size={ICON_GLYPH} color={cta} style={{ opacity: pending ? 0.25 : 1 }} />
        {pending ? (
          <View style={styles.iconSpinner}>
            <ActivityIndicator size="small" color={cta} />
          </View>
        ) : null}
        {showBadge ? (
          <View style={[styles.cartQtyBadge, { backgroundColor: cta }]}>
            <ThemedText style={styles.cartQtyBadgeTxt}>{inCartQty > 99 ? '99+' : String(inCartQty)}</ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function ProductCardInner({
  product,
  onPress,
  onLongPress,
  onBuyNow,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  actionsDisabled,
  pendingAction,
  onRemoveFromWishlist,
  wishlistRemoveLabel,
  inCartQty,
}: {
  product: ProductDto;
  onPress: () => void;
  onLongPress?: () => void;
  onBuyNow?: () => void;
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
  actionsDisabled?: boolean;
  pendingAction?: ProductQuickAction | null;
  onRemoveFromWishlist?: () => void;
  wishlistRemoveLabel?: string;
  /** Line quantity for this product in the member's cart (shop list). */
  inCartQty?: number;
}) {
  const { t } = useI18n();
  const { border, card, cta, success, surface, radius, space, onCta } = useCommerceTheme();
  const cover = product.media?.[0]?.thumbnailUrl || product.media?.[0]?.url;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock <= 0;
  const showWishlistFab = Boolean(onToggleWishlist || onRemoveFromWishlist);
  const showActions = Boolean(onBuyNow || onAddToCart) && !onRemoveFromWishlist;
  const onWishlistPress = onRemoveFromWishlist ?? onToggleWishlist;
  const wishlistFilled = onRemoveFromWishlist ? true : Boolean(isWishlisted);
  const buyPending = pendingAction === 'buy';
  const cartPending = pendingAction === 'cart';
  const cardBusy = pendingAction != null;
  const cartBadgeQty = typeof inCartQty === 'number' && inCartQty > 0 ? inCartQty : undefined;
  const cartA11yHint =
    cartBadgeQty != null ? t('productInCartA11y', { count: cartBadgeQty }) : undefined;

  const a11yParts = [product.title, product.seller.displayName];
  if (lowStock) a11yParts.push(t('productLowStockLine', { count: product.stock, unit: product.stockUnit }));

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: border,
          backgroundColor: card,
          borderRadius: radius.lg,
          marginHorizontal: space.sm,
          marginBottom: space.md,
          ...Platform.select({
            ios: {
              shadowColor: '#0284C7',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
          }),
        },
      ]}>
      <View style={styles.cardTop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yParts.join('. ')}
          accessibilityHint={t('productCardA11yHint')}
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={outOfStock && !showActions}
          style={({ pressed }) => [pressed && styles.pressed]}>
          <View style={[styles.mediaWrap, { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.img} contentFit="cover" cachePolicy="disk" transition={120} />
            ) : (
              <View style={[styles.img, styles.placeholder, { backgroundColor: withAlpha(surface, 0.6) }]} />
            )}
            <ProductImageBadges
              productType={product.productType}
              showLowStock={lowStock}
              lowStockLabel={t('productLowStockLine', { count: product.stock, unit: product.stockUnit })}
            />
            {outOfStock ? (
              <View style={[styles.oosOverlay, { backgroundColor: withAlpha('#0F172A', 0.5) }]}>
                <ThemedText style={styles.oosText}>{t('productOutOfStock')}</ThemedText>
              </View>
            ) : null}
          </View>
          <View style={[styles.body, { padding: space.md, gap: 4 }]}>
            <ThemedText numberOfLines={2} type="defaultSemiBold" style={styles.productTitle}>
              {product.title}
            </ThemedText>
            <SellerBadge name={product.seller.displayName} verified={product.seller.isVerifiedSeller} color={success} />
            <PriceLabel amount={product.price} accent />
          </View>
        </Pressable>

        {showWishlistFab ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={wishlistRemoveLabel ?? t('wishlistToggleA11y')}
            accessibilityState={{ disabled: actionsDisabled, selected: wishlistFilled }}
            disabled={actionsDisabled}
            onPress={() => onWishlistPress?.()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.wishlistFab,
              {
                backgroundColor: withAlpha(card, 0.92),
                borderColor: wishlistFilled ? cta : border,
                borderWidth: 1,
                borderRadius: radius.pill,
                opacity: actionsDisabled ? 0.5 : pressed ? 0.88 : 1,
              },
            ]}>
            <IconSymbol name={wishlistFilled ? 'heart.fill' : 'heart'} size={18} color={cta} />
          </Pressable>
        ) : null}
      </View>

      {showActions ? (
        <View
          style={[
            styles.actionsRail,
            {
              height: ACTION_ROW_H,
              paddingHorizontal: space.md,
              paddingBottom: space.md,
              gap: 6,
            },
          ]}>
          <IconActionBtn
            label={t('addToCart')}
            icon="cart.fill"
            onPress={onAddToCart}
            disabled={actionsDisabled || outOfStock || cardBusy}
            pending={cartPending}
            borderColor={border}
            cta={cta}
            card={card}
            radius={radius}
            inCartQty={cartBadgeQty}
            a11yHint={cartA11yHint}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('buyNow')}
            accessibilityState={{ disabled: actionsDisabled || outOfStock || cardBusy, busy: buyPending }}
            disabled={actionsDisabled || outOfStock || (cardBusy && !buyPending)}
            onPress={onBuyNow}
            style={({ pressed }) => [
              styles.buyBtn,
              {
                backgroundColor: cta,
                borderRadius: radius.md,
                opacity: actionsDisabled || outOfStock ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}>
            <View style={styles.buyBtnInner}>
              <ThemedText
                style={[styles.buyTxt, { color: onCta, opacity: buyPending ? 0 : 1 }]}
                numberOfLines={1}>
                {t('buyNow')}
              </ThemedText>
              {buyPending ? (
                <View style={styles.buySpinner} pointerEvents="none">
                  <ActivityIndicator size="small" color={onCta} />
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
      ) : null}

    </View>
  );
}

export const ProductCard = memo(ProductCardInner);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: { opacity: 0.96 },
  cardTop: { position: 'relative' },
  mediaWrap: { overflow: 'hidden', position: 'relative' },
  img: { width: '100%', aspectRatio: 4 / 5 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oosText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: {},
  productTitle: { lineHeight: 20, fontSize: 14, minHeight: 40 },
  actionsRail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyBtn: {
    flex: 1,
    height: ACTION_ROW_H,
    justifyContent: 'center',
    paddingHorizontal: 10,
    minWidth: 72,
  },
  buyBtnInner: {
    height: ACTION_ROW_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyTxt: {
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  buySpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: ICON_BTN,
    height: ICON_BTN,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnInner: {
    position: 'relative',
    width: ICON_BTN,
    height: ICON_BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  cartQtyBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cartQtyBadgeTxt: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  wishlistFab: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 4,
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
