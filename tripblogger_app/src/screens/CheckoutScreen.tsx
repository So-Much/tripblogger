import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';
import type { AddressDto } from '@/src/types/commerce';

const FREE_SHIP = 500_000;
const SHIP_FEE = 30_000;

export function CheckoutScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');

  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const [coupon, setCoupon] = useState('');
  const [note, setNote] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const cartQ = useQuery({ queryKey: ['commerce', 'cart'], queryFn: () => commerceService.getCart() });
  const addrQ = useQuery({ queryKey: ['commerce', 'addresses'], queryFn: () => commerceService.listAddresses() });

  const sub = cartQ.data?.subTotal ?? 0;

  const couponsAvailQ = useQuery({
    queryKey: ['commerce', 'coupons', 'available', sub],
    queryFn: () => commerceService.listAvailableCoupons(sub),
    enabled: sub > 0,
  });

  const ship = sub >= FREE_SHIP ? 0 : SHIP_FEE;
  const totalPreview = Math.max(0, sub + ship - appliedDiscount);

  const addresses = addrQ.data ?? [];
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const effectiveAddressId = pickedAddressId ?? defaultAddr?.id ?? null;

  const categoryIds = useMemo(() => {
    const ids = (cartQ.data?.items ?? []).map((i) => i.product.categoryId);
    return [...new Set(ids)];
  }, [cartQ.data?.items]);
  const productIds = useMemo(() => (cartQ.data?.items ?? []).map((i) => i.productId), [cartQ.data?.items]);

  const validateCoupon = useMutation({
    mutationFn: () =>
      commerceService.validateCoupon({
        code: coupon.trim(),
        cartSubTotal: sub,
        categoryIds,
        productIds,
      }),
    onSuccess: (r) => {
      if (r.valid && r.discountAmount != null) {
        setAppliedDiscount(r.discountAmount);
        return;
      }
      setAppliedDiscount(0);
      Alert.alert('Coupon', r.reason ?? 'Invalid');
    },
  });

  const checkout = useMutation({
    mutationFn: (addressId: string) =>
      commerceService.checkout({
        addressId,
        couponCode: appliedDiscount > 0 && coupon.trim() ? coupon.trim() : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: (o) => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      router.replace(`/(tabs)/shop/order/${o.id}` as Href);
    },
    onError: (e) => Alert.alert('Error', formatApiError(e, '')),
  });

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ThemedText type="subtitle">{t('addressesTitle')}</ThemedText>
        {addresses.map((a: AddressDto) => (
          <Pressable
            key={a.id}
            onPress={() => setPickedAddressId(a.id)}
            style={[styles.addr, { borderColor: effectiveAddressId === a.id ? tint : border }]}>
            <ThemedText>{a.recipientName}</ThemedText>
            <ThemedText style={styles.small}>
              {a.street}, {a.ward}, {a.district}, {a.province}
            </ThemedText>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/(tabs)/shop/addresses')} style={{ marginBottom: 12 }}>
          <ThemedText type="link">{t('addressNew')}</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">{t('couponCode')}</ThemedText>
        <View style={styles.row}>
          <TextInput
            value={coupon}
            onChangeText={(v) => {
              setCoupon(v);
              setAppliedDiscount(0);
            }}
            style={[styles.inp, { borderColor: border, color: text, flex: 1 }]}
          />
          <Pressable onPress={() => validateCoupon.mutate()} style={[styles.apply, { borderColor: border }]}>
            <ThemedText>{t('couponApply')}</ThemedText>
          </Pressable>
        </View>
        {couponsAvailQ.data?.length ? (
          <>
            <ThemedText type="subtitle">{t('couponsAvailable')}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couponRow}>
              {couponsAvailQ.data.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setCoupon(c.code);
                    setAppliedDiscount(0);
                  }}
                  style={[styles.couponChip, { borderColor: border }]}>
                  <ThemedText type="defaultSemiBold">{c.code}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
        <ThemedText type="subtitle">{t('noteOptional')}</ThemedText>
        <TextInput value={note} onChangeText={setNote} style={[styles.inp, { borderColor: border, color: text }]} />
        <ThemedText>
          {t('subtotalLabel')}: <PriceLabel amount={sub} />
        </ThemedText>
        {ship === 0 ? (
          <ThemedText>{t('shippingFeeFree')}</ThemedText>
        ) : (
          <ThemedText>
            {t('shippingFee')}: <PriceLabel amount={ship} />
          </ThemedText>
        )}
        <ThemedText>
          {t('discountLabel')}: <PriceLabel amount={appliedDiscount} />
        </ThemedText>
        <ThemedText type="title" style={{ marginTop: 8 }}>
          {t('totalLabel')}: <PriceLabel amount={totalPreview} />
        </ThemedText>
        <Pressable
          style={[styles.cta, { backgroundColor: tint }]}
          disabled={!effectiveAddressId || checkout.isPending || (cartQ.data?.itemCount ?? 0) === 0}
          onPress={() => checkout.mutate(effectiveAddressId!)}>
          <ThemedText style={styles.ctaTxt}>{t('orderPlace')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, gap: 10, paddingBottom: 40 },
  addr: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  small: { fontSize: 12, opacity: 0.75, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inp: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15 },
  apply: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  couponRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  couponChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  cta: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700' },
});
