import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
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

  const q = useQuery({ queryKey: ['commerce', 'cart'], queryFn: () => commerceService.getCart() });

  const upd = useMutation({
    mutationFn: ({ id, q }: { id: string; q: number }) => commerceService.updateCartItem(id, { quantity: q }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => commerceService.removeCartItem(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] }),
    onError: (e) => Alert.alert('', formatApiError(e, '')),
  });

  const items = q.data?.items ?? [];

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      {q.isError ? (
        <ThemedText>{formatApiError(q.error, '')}</ThemedText>
      ) : q.isLoading ? (
        <ActivityIndicator />
      ) : items.length === 0 ? (
        <ThemedText style={styles.empty}>{t('cartEmpty')}</ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.pad}>
          {items.map((line) => {
            const img = line.product.media?.[0]?.thumbnailUrl || line.product.media?.[0]?.url;
            const priceChanged = line.product.price !== line.priceSnapshot;
            return (
              <View key={line.id} style={[styles.row, { borderColor: border }]}>
                {img ? <Image source={{ uri: img }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: '#2222' }]} />}
                <View style={styles.info}>
                  <ThemedText numberOfLines={2}>{line.product.title}</ThemedText>
                  <SellerBadge
                    name={line.product.seller.displayName}
                    verified={line.product.seller.isVerifiedSeller}
                    color={tint}
                  />
                  <View style={styles.priceRow}>
                    <PriceLabel amount={line.priceSnapshot} />
                    {priceChanged ? (
                      <ThemedText style={styles.priceHint}>
                        {t('cartPriceNow')}: <PriceLabel amount={line.product.price} />
                      </ThemedText>
                    ) : null}
                  </View>
                  {priceChanged ? (
                    <ThemedText style={styles.warn}>{t('cartPriceChanged')}</ThemedText>
                  ) : null}
                  <View style={styles.actions}>
                    <View style={styles.step}>
                      <Pressable onPress={() => upd.mutate({ id: line.id, q: Math.max(0, line.quantity - 1) })} style={styles.stepBtn}>
                        <ThemedText>-</ThemedText>
                      </Pressable>
                      <ThemedText>{line.quantity}</ThemedText>
                      <Pressable onPress={() => upd.mutate({ id: line.id, q: line.quantity + 1 })} style={styles.stepBtn}>
                        <ThemedText>+</ThemedText>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => del.mutate(line.id)} style={styles.removeBtn}>
                      <ThemedText style={{ color: '#b91c1c' }}>{t('cartRemoveLine')}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          <ThemedText type="subtitle" style={{ marginTop: 12 }}>
            {t('subtotalLabel')}: <PriceLabel amount={q.data?.subTotal ?? 0} />
          </ThemedText>
          <PressableScale
            style={[styles.checkout, { backgroundColor: tint }]}
            onPress={() => router.push('/(tabs)/shop/checkout')}>
            <ThemedText style={styles.checkoutTxt}>{t('orderCheckout')}</ThemedText>
          </PressableScale>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 32, opacity: 0.7 },
  row: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  info: { flex: 1, gap: 6 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  priceHint: { fontSize: 12, opacity: 0.85 },
  warn: { fontSize: 12, color: '#b45309' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#8884' },
  checkout: { marginTop: 20, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  checkoutTxt: { color: '#fff', fontWeight: '700' },
});
