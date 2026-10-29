import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';
import { formatLocalDateTime } from '@/src/utils/datetime';
import type { AddressDto } from '@/src/types/commerce';
import { ActionPulse } from '@/src/components/feedback/ActionPulse';
import { PressableScale } from '@/src/components/feedback/PressableScale';

const FREE_SHIP = 500_000;
const SHIP_FEE = 30_000;

export function CheckoutScreen() {
  const { t } = useI18n();
  const { buyNow } = useLocalSearchParams<{ buyNow?: string }>();
  const isBuyNow = buyNow === '1';
  const router = useRouter();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const onCta = useThemeColor({}, 'onCta');
  const primary = useThemeColor({}, 'primary');
  const meQ = useMeQuery();
  const isGuest = meQ.data?.role === 'GUEST';
  const isMember = meQ.data?.role === 'MEMBER';

  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const [coupon, setCoupon] = useState('');
  const [note, setNote] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [highlightCoupon, setHighlightCoupon] = useState<string | null>(null);
  const [orderPulse, setOrderPulse] = useState(0);
  const [guestRecipientName, setGuestRecipientName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestProvince, setGuestProvince] = useState('');
  const [guestDistrict, setGuestDistrict] = useState('');
  const [guestWard, setGuestWard] = useState('');
  const [guestStreet, setGuestStreet] = useState('');

  const cartQ = useQuery({ queryKey: ['commerce', 'cart'], queryFn: () => commerceService.getCart() });
  const addrQ = useQuery({
    queryKey: ['commerce', 'addresses'],
    queryFn: () => commerceService.listAddresses(),
    enabled: isMember,
  });

  const sub = cartQ.data?.subTotal ?? 0;

  const couponsAvailQ = useQuery({
    queryKey: ['commerce', 'coupons', 'available', sub],
    queryFn: () => commerceService.listAvailableCoupons(sub),
    enabled: isMember && sub > 0,
  });

  const ship = sub >= FREE_SHIP ? 0 : SHIP_FEE;
  const totalPreview = Math.max(0, sub + ship - appliedDiscount);

  const addresses = isGuest ? [] : addrQ.data ?? [];
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const effectiveAddressId = pickedAddressId ?? defaultAddr?.id ?? null;

  const categoryIds = useMemo(() => {
    const ids = (cartQ.data?.items ?? []).map((i) => i.product.categoryId);
    return [...new Set(ids)];
  }, [cartQ.data?.items]);
  const productIds = useMemo(() => (cartQ.data?.items ?? []).map((i) => i.productId), [cartQ.data?.items]);

  const validateCoupon = useMutation({
    mutationFn: (codeInput?: string) =>
      commerceService.validateCoupon({
        code: (codeInput ?? coupon).trim(),
        cartSubTotal: sub,
        categoryIds,
        productIds,
      }),
    onSuccess: (r, codeInput) => {
      const appliedCode = (codeInput ?? coupon).trim().toUpperCase();
      if (codeInput) setCoupon(codeInput);
      if (r.valid && r.discountAmount != null) {
        setAppliedDiscount(r.discountAmount);
        setHighlightCoupon(appliedCode);
        return;
      }
      setAppliedDiscount(0);
      Alert.alert(t('couponCode'), r.reason ?? t('couponInvalid'));
    },
    onError: (e) => Alert.alert(t('couponCode'), formatApiError(e, t('couponInvalid'))),
  });

  const checkout = useMutation({
    mutationFn: (addressId?: string) =>
      commerceService.checkout({
        addressId: isGuest ? undefined : addressId,
        couponCode: appliedDiscount > 0 && coupon.trim() ? coupon.trim() : undefined,
        note: note.trim() || undefined,
        guestInfo: isGuest
          ? {
              recipientName: guestRecipientName.trim(),
              phone: guestPhone.trim(),
              email: guestEmail.trim(),
              province: guestProvince.trim(),
              district: guestDistrict.trim(),
              ward: guestWard.trim(),
              street: guestStreet.trim(),
            }
          : undefined,
      }),
    onSuccess: (o) => {
      setOrderPulse((k) => k + 1);
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      setTimeout(() => router.replace(`/(tabs)/shop/order/${o.id}` as Href), 180);
    },
    onError: (e) => Alert.alert('Error', formatApiError(e, '')),
  });

  const guestInfoValid =
    guestRecipientName.trim() &&
    guestPhone.trim() &&
    guestEmail.trim() &&
    guestProvince.trim() &&
    guestDistrict.trim() &&
    guestWard.trim() &&
    guestStreet.trim();

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        {isBuyNow ? (
          <View style={[styles.buyNowBanner, { backgroundColor: primary, borderColor: border }]}>
            <ThemedText type="defaultSemiBold">{t('checkoutBuyNowTitle')}</ThemedText>
            <ThemedText style={styles.small}>{t('checkoutBuyNowHint')}</ThemedText>
          </View>
        ) : null}
        {isGuest ? (
          <>
            <ThemedText type="subtitle">{t('addressesTitle')}</ThemedText>
            <ThemedText style={styles.small}>{t('guestCheckoutHint')}</ThemedText>
            <TextInput placeholder={t('addressRecipient')} placeholderTextColor={text} value={guestRecipientName} onChangeText={setGuestRecipientName} style={[styles.inp, { borderColor: border, color: text }]} />
            <TextInput placeholder={t('addressPhone')} placeholderTextColor={text} value={guestPhone} onChangeText={setGuestPhone} style={[styles.inp, { borderColor: border, color: text }]} />
            <TextInput placeholder={t('guestEmail')} placeholderTextColor={text} value={guestEmail} onChangeText={setGuestEmail} autoCapitalize="none" keyboardType="email-address" style={[styles.inp, { borderColor: border, color: text }]} />
            <TextInput placeholder={t('addressProvince')} placeholderTextColor={text} value={guestProvince} onChangeText={setGuestProvince} style={[styles.inp, { borderColor: border, color: text }]} />
            <TextInput placeholder={t('addressDistrict')} placeholderTextColor={text} value={guestDistrict} onChangeText={setGuestDistrict} style={[styles.inp, { borderColor: border, color: text }]} />
            <TextInput placeholder={t('addressWard')} placeholderTextColor={text} value={guestWard} onChangeText={setGuestWard} style={[styles.inp, { borderColor: border, color: text }]} />
            <TextInput placeholder={t('addressStreet')} placeholderTextColor={text} value={guestStreet} onChangeText={setGuestStreet} style={[styles.inp, { borderColor: border, color: text }]} />
          </>
        ) : (
          <>
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
          </>
        )}
        {!isGuest ? (
          <>
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
          <PressableScale onPress={() => validateCoupon.mutate(undefined)} style={[styles.apply, { borderColor: border }]}>
            <ThemedText>{t('couponApply')}</ThemedText>
          </PressableScale>
        </View>
        {couponsAvailQ.data?.length ? (
          <>
            <ThemedText type="subtitle">{t('couponsAvailable')}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couponRow}>
              {couponsAvailQ.data.map((c) => (
                <PressableScale
                  key={c.id}
                  onPress={() => validateCoupon.mutate(c.code)}
                  style={[
                    styles.couponChip,
                    {
                      borderColor: highlightCoupon === c.code.toUpperCase() ? tint : border,
                      backgroundColor: highlightCoupon === c.code.toUpperCase() ? primary : undefined,
                    },
                  ]}>
                  <View>
                    <ThemedText type="defaultSemiBold">{c.code}</ThemedText>
                    <ThemedText style={styles.couponMeta}>
                      {t('couponExpires', { date: formatLocalDateTime(c.expiresAt).split(', ')[1] ?? formatLocalDateTime(c.expiresAt) })}
                    </ThemedText>
                    {c.minOrderValue != null && c.minOrderValue > 0 ? (
                      <ThemedText style={styles.couponMeta}>
                        {t('couponMinOrder', { amount: c.minOrderValue.toLocaleString('vi-VN') })}
                      </ThemedText>
                    ) : null}
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </>
        ) : null}
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
      </ScrollView>
      <View style={[styles.footer, { borderColor: border }]}>
        <ThemedText type="title">
          {t('totalLabel')}: <PriceLabel amount={totalPreview} />
        </ThemedText>
        <ActionPulse pulseKey={orderPulse}>
          <PressableScale
            style={[styles.cta, { backgroundColor: tint }]}
            disabled={
              (!isGuest && !effectiveAddressId) ||
              (isGuest && !guestInfoValid) ||
              checkout.isPending ||
              (cartQ.data?.itemCount ?? 0) === 0
            }
            onPress={() => checkout.mutate(effectiveAddressId ?? undefined)}>
            {checkout.isPending ? (
              <ActivityIndicator color={onCta} />
            ) : (
              <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('orderPlace')}</ThemedText>
            )}
          </PressableScale>
        </ActionPulse>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, gap: 10, paddingBottom: 16 },
  footer: { padding: 16, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  buyNowBanner: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4, marginBottom: 4 },
  addr: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  small: { fontSize: 12, opacity: 0.75, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inp: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15 },
  apply: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  couponRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  couponChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 120, gap: 2, maxWidth: 200 },
  couponMeta: { fontSize: 11, opacity: 0.75, marginTop: 2 },
  cta: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center', minHeight: 48 },
  ctaTxt: { fontWeight: '700' },
});
