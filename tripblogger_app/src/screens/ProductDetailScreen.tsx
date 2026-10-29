import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useProductQuickActions } from '@/src/hooks/use-product-quick-actions';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';
import { ProductTypeBadge } from '@/src/components/commerce/ProductTypeBadge';
import { SellerBadge } from '@/src/components/commerce/SellerBadge';
import { StockInfo } from '@/src/components/commerce/StockInfo';
import { ActionPulse } from '@/src/components/feedback/ActionPulse';
import { PressableScale } from '@/src/components/feedback/PressableScale';

export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const navigation = useNavigation();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMeQuery();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const card = useThemeColor({}, 'card');
  const onCta = useThemeColor({}, 'onCta');
  const success = useThemeColor({}, 'success');
  const [qty, setQty] = useState('1');
  const [cartPulse, setCartPulse] = useState(0);
  const cartBounce = useRef(new Animated.Value(1)).current;

  const q = useQuery({
    queryKey: ['commerce', 'product', id],
    queryFn: () => commerceService.getProduct(String(id)),
    enabled: !!id,
  });

  const summaryQ = useQuery({
    queryKey: ['commerce', 'ratings', 'summary', id],
    queryFn: () => commerceService.getRatingSummary(String(id)),
    enabled: !!id,
  });

  const ratingsPreviewQ = useQuery({
    queryKey: ['commerce', 'ratings', 'preview', id],
    queryFn: () => commerceService.listProductRatings(String(id), { limit: 3, sort: 'newest' }),
    enabled: !!id,
  });

  const wishlistQ = useQuery({
    queryKey: ['commerce', 'wishlist', 'ids'],
    queryFn: async () => {
      const res = await commerceService.listWishlist({ limit: 100 });
      return new Set(res.items.map((p) => p.id));
    },
    enabled: me.data?.role === 'MEMBER',
    staleTime: 60_000,
  });

  const quickActions = useProductQuickActions();

  const addCart = useMutation({
    mutationFn: () =>
      commerceService.addToCart({ productId: String(id), quantity: Math.max(1, parseInt(qty, 10) || 1) }),
    onSuccess: () => {
      setCartPulse((k) => k + 1);
      cartBounce.setValue(1);
      Animated.sequence([
        Animated.timing(cartBounce, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.spring(cartBounce, { toValue: 1, speed: 18, bounciness: 10, useNativeDriver: true }),
      ]).start();
      void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] });
    },
    onError: (e) => Alert.alert(t('cartTitle'), formatApiError(e, t('cartUpdateFailed'))),
  });

  const wish = useMutation({
    mutationFn: () => commerceService.toggleWishlist(String(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce', 'wishlist'] });
    },
    onError: (e) => Alert.alert(t('wishlistTitle'), formatApiError(e, '')),
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: q.data?.title ?? '…' });
  }, [navigation, q.data?.title]);

  const parsedQty = useMemo(() => Math.max(1, parseInt(qty, 10) || 1), [qty]);

  if (!id || q.isError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{formatApiError(q.error, t('productLoadFailed'))}</ThemedText>
      </ThemedView>
    );
  }

  if (q.isLoading || !q.data) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const p = q.data;
  const cover = p.media?.[0]?.previewUrl || p.media?.[0]?.url;
  const isMember = me.data?.role === 'MEMBER';
  const userRole = me.data?.role;
  const canBuy = userRole === 'MEMBER' || userRole === 'GUEST';
  const buyerId = me.data?.id;
  const isOwn = buyerId != null && p.sellerId === buyerId;
  const outOfStock = p.stock <= 0;
  const qtyTooHigh = parsedQty > p.stock;
  const canAdd = canBuy && p.status === 'PUBLISHED' && !isOwn && !outOfStock && !qtyTooHigh;
  const isWishlisted = wishlistQ.data?.has(String(id)) ?? false;

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {cover ? <Image source={{ uri: cover }} style={styles.hero} contentFit="cover" /> : <View style={[styles.hero, { backgroundColor: card }]} />}
        <ThemedView style={styles.pad}>
          <ThemedText type="title">{p.title}</ThemedText>
          <View style={styles.row}>
            <PriceLabel amount={p.price} />
            <ProductTypeBadge type={p.productType} />
          </View>
          <SellerBadge name={p.seller.displayName} verified={p.seller.isVerifiedSeller} color={success} />
          <StockInfo stock={p.stock} unit={p.stockUnit} />
          <ThemedText style={styles.rating}>
            {t('ratingTitle')}: {Number(summaryQ.data?.avgRating ?? 0).toFixed(1)} ({summaryQ.data?.totalRatings ?? 0})
          </ThemedText>
          {(ratingsPreviewQ.data?.items?.length ?? 0) > 0 ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <ThemedText type="subtitle">{t('productRatingsPreview')}</ThemedText>
              {(ratingsPreviewQ.data?.items ?? []).map((r) => (
                <View key={r.id} style={[styles.revCard, { borderColor: border }]}>
                  <ThemedText type="defaultSemiBold">{r.displayName ?? t('ratingAnonymous')}</ThemedText>
                  <View style={styles.starRow}>
                    {Array.from({ length: r.score }).map((_, i) => (
                      <IconSymbol key={i} name="star.fill" size={14} color={tint} />
                    ))}
                  </View>
                  {r.review ? <ThemedText numberOfLines={3}>{r.review}</ThemedText> : null}
                </View>
              ))}
              <Pressable onPress={() => router.push(`/(tabs)/shop/ratings/${id}` as Href)}>
                <ThemedText type="link">{t('ratingsSeeAll')}</ThemedText>
              </Pressable>
            </View>
          ) : null}
          <ThemedText style={styles.desc}>{p.description.replace(/<[^>]+>/g, ' ')}</ThemedText>
          {isOwn ? (
            <Pressable
              style={[styles.cta, { backgroundColor: tint, marginTop: 12 }]}
              onPress={() => router.push(`/(tabs)/shop/edit/${p.id}` as Href)}>
              <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('productEdit')}</ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </ScrollView>

      {canBuy && p.status === 'PUBLISHED' && !isOwn ? (
        <View style={[styles.footer, { borderColor: border, backgroundColor: card }]}>
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
            accessibilityLabel={t('productQuantityShort')}
            style={[styles.qty, { borderColor: border, color: text }]}
          />
          <ActionPulse pulseKey={cartPulse} style={{ flex: 1 }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('addToCart')}
              style={[styles.cta, { backgroundColor: tint, opacity: !canAdd || addCart.isPending ? 0.55 : 1 }]}
              onPress={() => addCart.mutate()}
              disabled={!canAdd || addCart.isPending}>
              <Animated.View style={{ transform: [{ scale: cartBounce }], alignItems: 'center' }}>
                <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('addToCart')}</ThemedText>
              </Animated.View>
            </PressableScale>
          </ActionPulse>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('buyNow')}
            style={[styles.buyBtn, { backgroundColor: success, opacity: outOfStock || quickActions.isBusy ? 0.55 : 1 }]}
            disabled={outOfStock || quickActions.isBusy}
            onPress={() => quickActions.run('buy', String(id), userRole)}>
            <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('buyNow')}</ThemedText>
          </PressableScale>
          {isMember ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('wishlistToggleA11y')}
              style={[styles.cta2, { borderColor: border, opacity: wish.isPending ? 0.55 : 1 }]}
              disabled={wish.isPending}
              onPress={() => wish.mutate()}>
              <IconSymbol name={isWishlisted ? 'heart.fill' : 'heart'} size={22} color={tint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { paddingBottom: 16 },
  hero: { width: '100%', height: 260 },
  pad: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  rating: { marginTop: 8, opacity: 0.85 },
  desc: { marginTop: 12, lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qty: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, width: 52, fontSize: 16 },
  cta: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', minHeight: 44 },
  buyBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', minHeight: 44 },
  ctaTxt: { fontWeight: '700', fontSize: 14 },
  cta2: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  starRow: { flexDirection: 'row', gap: 2 },
});
