import { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';
import { ProductTypeBadge } from '@/src/components/commerce/ProductTypeBadge';
import { SellerBadge } from '@/src/components/commerce/SellerBadge';
import { StockInfo } from '@/src/components/commerce/StockInfo';

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
  const [qty, setQty] = useState('1');

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

  const addCart = useMutation({
    mutationFn: () =>
      commerceService.addToCart({ productId: String(id), quantity: Math.max(1, parseInt(qty, 10) || 1) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] });
      Alert.alert(t('cartTitle'), 'OK');
    },
  });

  const wish = useMutation({
    mutationFn: () => commerceService.toggleWishlist(String(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'wishlist'] }),
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: q.data?.title ?? '…' });
  }, [navigation, q.data?.title]);

  if (!id || q.isError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{formatApiError(q.error, 'Error')}</ThemedText>
      </ThemedView>
    );
  }

  if (q.isLoading || !q.data) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>…</ThemedText>
      </ThemedView>
    );
  }

  const p = q.data;
  const cover = p.media?.[0]?.previewUrl || p.media?.[0]?.url;
  const isMember = me.data?.role === 'MEMBER';
  const buyerId = me.data?.id;
  const isOwn = buyerId != null && p.sellerId === buyerId;

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
          <SellerBadge name={p.seller.displayName} verified={p.seller.isVerifiedSeller} color={tint} />
          <StockInfo stock={p.stock} unit={p.stockUnit} />
          <ThemedText style={styles.rating}>
            {t('ratingTitle')}: {Number(summaryQ.data?.avgRating ?? 0).toFixed(1)} ({summaryQ.data?.totalRatings ?? 0})
          </ThemedText>
          {(ratingsPreviewQ.data?.items?.length ?? 0) > 0 ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <ThemedText type="subtitle">{t('productRatingsPreview')}</ThemedText>
              {(ratingsPreviewQ.data?.items ?? []).map((r) => (
                <View key={r.id} style={[styles.revCard, { borderColor: border }]}>
                  <ThemedText type="defaultSemiBold">{r.displayName ?? '—'}</ThemedText>
                  <ThemedText>{'★'.repeat(r.score)}</ThemedText>
                  {r.review ? <ThemedText numberOfLines={3}>{r.review}</ThemedText> : null}
                </View>
              ))}
              <Pressable onPress={() => router.push(`/(tabs)/shop/ratings/${id}` as Href)}>
                <ThemedText type="link">{t('ratingsSeeAll')}</ThemedText>
              </Pressable>
            </View>
          ) : null}
          <ThemedText style={styles.desc}>{p.description.replace(/<[^>]+>/g, ' ')}</ThemedText>
          {isMember && p.status === 'PUBLISHED' && !isOwn ? (
            <View style={styles.buyRow}>
              <TextInput
                value={qty}
                onChangeText={setQty}
                keyboardType="number-pad"
                style={[styles.qty, { borderColor: border, color: text }]}
              />
              <Pressable
                style={[styles.cta, { backgroundColor: tint }]}
                onPress={() => addCart.mutate()}
                disabled={addCart.isPending}>
                <ThemedText style={styles.ctaTxt}>{t('addToCart')}</ThemedText>
              </Pressable>
              <Pressable style={[styles.cta2, { borderColor: border }]} onPress={() => wish.mutate()}>
                <ThemedText type="link">♥</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { paddingBottom: 32 },
  hero: { width: '100%', height: 260 },
  pad: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  rating: { marginTop: 8, opacity: 0.85 },
  desc: { marginTop: 12, lineHeight: 22 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  qty: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, width: 56, fontSize: 16 },
  cta: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700' },
  cta2: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  revCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
});
