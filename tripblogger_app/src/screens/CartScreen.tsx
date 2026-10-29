import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { CartItemDto } from '@/src/types/commerce';
import { formatApiError } from '@/src/utils/format-api-error';
import { Image } from 'expo-image';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';
import { SellerBadge } from '@/src/components/commerce/SellerBadge';
import { PressableScale } from '@/src/components/feedback/PressableScale';

export function CartScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const onCta = useThemeColor({}, 'onCta');
  const danger = useThemeColor({}, 'danger');
  const warn = useThemeColor({}, 'warning');

  const q = useQuery({ queryKey: ['commerce', 'cart'], queryFn: () => commerceService.getCart() });

  const showCartError = (e: unknown) => Alert.alert(t('cartTitle'), formatApiError(e, t('cartUpdateFailed')));

  const upd = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => commerceService.updateCartItem(id, { quantity: qty }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] }),
    onError: showCartError,
  });

  const del = useMutation({
    mutationFn: (id: string) => commerceService.removeCartItem(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] }),
    onError: showCartError,
  });

  const items = q.data?.items ?? [];

  const changeQty = (line: CartItemDto, delta: number) => {
    const nextQty = line.quantity + delta;
    if (nextQty <= 0) {
      Alert.alert(t('cartRemoveLine'), t('cartRemoveLineConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('cartRemoveLine'), style: 'destructive', onPress: () => del.mutate(line.id) },
      ]);
      return;
    }
    if (nextQty > line.product.stock) {
      Alert.alert(t('cartTitle'), t('cartInsufficientStock', { stock: line.product.stock }));
      return;
    }
    upd.mutate({ id: line.id, qty: nextQty });
  };

  const renderLine = ({ item: line }: { item: CartItemDto }) => {
    const img = line.product.media?.[0]?.thumbnailUrl || line.product.media?.[0]?.url;
    const priceChanged = line.product.price !== line.priceSnapshot;
    const atMaxStock = line.quantity >= line.product.stock;
    return (
      <View style={[styles.row, { borderColor: border }]}>
        {img ? <Image source={{ uri: img }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbPlaceholder]} />}
        <View style={styles.info}>
          <ThemedText numberOfLines={2}>{line.product.title}</ThemedText>
          <SellerBadge name={line.product.seller.displayName} verified={line.product.seller.isVerifiedSeller} color={tint} />
          <View style={styles.priceRow}>
            <PriceLabel amount={line.priceSnapshot} />
            {priceChanged ? (
              <ThemedText style={styles.priceHint}>
                {t('cartPriceNow')}: <PriceLabel amount={line.product.price} />
              </ThemedText>
            ) : null}
          </View>
          {priceChanged ? <ThemedText style={[styles.warn, { color: warn }]}>{t('cartPriceChanged')}</ThemedText> : null}
          <View style={styles.actions}>
            <View style={styles.step}>
              <Pressable onPress={() => changeQty(line, -1)} style={[styles.stepBtn, { borderColor: border }]}>
                <ThemedText>-</ThemedText>
              </Pressable>
              <ThemedText>{line.quantity}</ThemedText>
              <Pressable
                onPress={() => changeQty(line, 1)}
                disabled={atMaxStock || upd.isPending}
                style={[styles.stepBtn, { borderColor: border, opacity: atMaxStock ? 0.4 : 1 }]}>
                <ThemedText>+</ThemedText>
              </Pressable>
            </View>
            <Pressable onPress={() => del.mutate(line.id)} style={styles.removeBtn}>
              <ThemedText style={{ color: danger }}>{t('cartRemoveLine')}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      {q.isError ? (
        <ThemedText style={styles.empty}>{formatApiError(q.error, '')}</ThemedText>
      ) : q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <ThemedText style={styles.empty}>{t('cartEmpty')}</ThemedText>
      ) : (
        <ThemedView style={styles.flex}>
          <FlatList
            data={items}
            keyExtractor={(line) => line.id}
            renderItem={renderLine}
            contentContainerStyle={styles.pad}
            initialNumToRender={8}
          />
          <View style={[styles.footer, { borderColor: border }]}>
            <ThemedText type="subtitle">
              {t('subtotalLabel')}: <PriceLabel amount={q.data?.subTotal ?? 0} />
            </ThemedText>
            <PressableScale style={[styles.checkout, { backgroundColor: tint }]} onPress={() => router.push('/(tabs)/shop/checkout')}>
              <ThemedText style={[styles.checkoutTxt, { color: onCta }]}>{t('orderCheckout')}</ThemedText>
            </PressableScale>
          </View>
        </ThemedView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, paddingBottom: 8 },
  footer: { padding: 16, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  empty: { textAlign: 'center', marginTop: 32, opacity: 0.7, padding: 16 },
  row: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: 'rgba(0,0,0,0.08)' },
  info: { flex: 1, gap: 6 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  priceHint: { fontSize: 12, opacity: 0.85 },
  warn: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  checkout: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', minHeight: 48 },
  checkoutTxt: { fontWeight: '700' },
});
