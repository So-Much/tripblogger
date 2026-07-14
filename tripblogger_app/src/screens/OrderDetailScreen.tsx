import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAndroidBack } from '@/src/hooks/useAndroidBack';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { useSettingsStore } from '@/src/store/settings.store';
import { formatOrderStatus, formatPaymentMethod, formatPaymentStatus, formatShipmentStatus } from '@/src/utils/format-order-status';
import { formatLocalDateTime } from '@/src/utils/datetime';
import { safeRouterBack } from '@/src/utils/safe-router-back';
import { Image } from 'expo-image';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';
import type { ShipmentCarrier, ShipmentDto, ShipmentStatus } from '@/src/types/commerce';

const CARRIERS: ShipmentCarrier[] = ['GHN', 'GHTK', 'VNPOST', 'OTHER'];

const NEXT_SHIPMENT: Record<ShipmentStatus, ShipmentStatus[]> = {
  WAITING: ['PICKING', 'INTRANSIT'],
  PICKING: ['INTRANSIT'],
  INTRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useI18n();
  const qc = useQueryClient();
  const me = useMeQuery();
  const language = useSettingsStore((s) => s.language);
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const card = useThemeColor({}, 'card');
  const onCta = useThemeColor({}, 'onCta');
  const success = useThemeColor({}, 'success');
  const primary = useThemeColor({}, 'primary');

  const [shipModal, setShipModal] = useState(false);
  const [shipCarrier, setShipCarrier] = useState<ShipmentCarrier>('OTHER');
  const [shipTrack, setShipTrack] = useState('');
  const [shipEst, setShipEst] = useState('');
  const [statusModal, setStatusModal] = useState<ShipmentDto | null>(null);
  const [ratingModal, setRatingModal] = useState<{ productId: string; orderProductId: string; title: string } | null>(
    null,
  );
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingText, setRatingText] = useState('');

  const leaveScreen = () => safeRouterBack(router, '/(tabs)/shop/orders');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={leaveScreen} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('backHome')}>
          <IconSymbol name="chevron.left" size={24} color={tint} />
        </Pressable>
      ),
    });
  }, [navigation, tint, t]);

  useAndroidBack(() => {
    if (ratingModal) {
      setRatingModal(null);
      return true;
    }
    if (statusModal) {
      setStatusModal(null);
      return true;
    }
    if (shipModal) {
      setShipModal(false);
      return true;
    }
    return false;
  });

  const q = useQuery({
    queryKey: ['commerce', 'order', id],
    queryFn: () => commerceService.getOrder(String(id)),
    enabled: !!id && !!me.data,
  });

  const shipmentsQ = useQuery({
    queryKey: ['commerce', 'order', id, 'shipments'],
    queryFn: () => commerceService.listShipments(String(id)),
    enabled: !!id && me.data?.role === 'MEMBER' && !!q.data,
  });

  const invalidateOrder = () => {
    void qc.invalidateQueries({ queryKey: ['commerce', 'order', id] });
    void qc.invalidateQueries({ queryKey: ['commerce', 'order', id, 'shipments'] });
    void qc.invalidateQueries({ queryKey: ['commerce', 'orders'] });
  };

  const cancel = useMutation({
    mutationFn: () => commerceService.cancelOrder(String(id)),
    onSuccess: invalidateOrder,
  });
  const confirm = useMutation({
    mutationFn: () => commerceService.confirmOrder(String(id)),
    onSuccess: invalidateOrder,
  });
  const received = useMutation({
    mutationFn: () => commerceService.confirmOrderReceived(String(id)),
    onSuccess: invalidateOrder,
  });
  const createShip = useMutation({
    mutationFn: () =>
      commerceService.createShipment(String(id), {
        carrier: shipCarrier,
        trackingCode: shipTrack.trim() || undefined,
        estimatedDelivery: shipEst.trim() || undefined,
      }),
    onSuccess: () => {
      setShipModal(false);
      setShipTrack('');
      setShipEst('');
      invalidateOrder();
    },
    onError: (e) => Alert.alert('', formatApiError(e, '')),
  });
  const patchStatus = useMutation({
    mutationFn: ({ sid, st }: { sid: string; st: ShipmentStatus }) =>
      commerceService.updateShipmentStatus(sid, { status: st }),
    onSuccess: () => {
      setStatusModal(null);
      invalidateOrder();
    },
    onError: (e) => Alert.alert('', formatApiError(e, '')),
  });
  const submitRating = useMutation({
    mutationFn: () =>
      commerceService.createProductRating(ratingModal!.productId, {
        orderProductId: ratingModal!.orderProductId,
        score: ratingScore,
        review: ratingText.trim() || undefined,
      }),
    onSuccess: () => {
      setRatingModal(null);
      setRatingText('');
      invalidateOrder();
      void qc.invalidateQueries({ queryKey: ['commerce', 'ratings'] });
    },
    onError: (e) => Alert.alert('', formatApiError(e, '')),
  });

  const myShipments = useMemo(() => {
    const uid = me.data?.id;
    if (!uid) return [];
    return (shipmentsQ.data ?? []).filter((s) => s.sellerId === uid);
  }, [shipmentsQ.data, me.data?.id]);

  if (!id || !me.data) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
        <Pressable style={[styles.loginCta, { borderColor: border }]} onPress={() => router.push('/login')}>
          <ThemedText type="link">{t('login')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (q.isError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{formatApiError(q.error, '')}</ThemedText>
      </ThemedView>
    );
  }

  if (!q.data) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const o = q.data;
  const isBuyer = me.data?.id === o.buyerId;
  const isSeller = (o.items ?? []).some((l) => l.sellerId === me.data?.id);
  const canCreateShipment =
    isSeller && myShipments.length === 0 && (o.status === 'CONFIRMED' || o.status === 'SHIPPING');

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ThemedText type="title">{o.orderCode}</ThemedText>
        <ThemedText>
          {t('orderStatus')}: {formatOrderStatus(o.status, language)}
        </ThemedText>

        {o.payment ? (
          <View style={[styles.card, { borderColor: border }]}>
            <ThemedText type="subtitle">{t('paymentSection')}</ThemedText>
            <ThemedText>
              {t('paymentMethod')}: {formatPaymentMethod(o.payment.method, language)}
            </ThemedText>
            <ThemedText>
              {t('paymentStatus')}: {formatPaymentStatus(o.payment.status, language)}
            </ThemedText>
            <PriceLabel amount={o.payment.amount} />
            {o.payment.paidAt ? (
              <ThemedText style={styles.small}>
                {t('paymentPaidAt')}: {formatLocalDateTime(o.payment.paidAt)}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {o.address || o.guestAddress ? (
          <View style={[styles.card, { borderColor: border }]}>
            <ThemedText type="subtitle">{t('addressSection')}</ThemedText>
            <ThemedText>{o.address?.recipientName ?? o.guestAddress?.recipientName}</ThemedText>
            <ThemedText style={styles.small}>
              {o.address?.street ?? o.guestAddress?.street}, {o.address?.ward ?? o.guestAddress?.ward},{' '}
              {o.address?.district ?? o.guestAddress?.district}, {o.address?.province ?? o.guestAddress?.province}
            </ThemedText>
            <ThemedText style={styles.small}>{o.address?.phone ?? o.guestAddress?.phone}</ThemedText>
            {!o.address && o.guestAddress?.email ? <ThemedText style={styles.small}>{o.guestAddress.email}</ThemedText> : null}
          </View>
        ) : null}

        <ThemedText style={{ marginTop: 8 }} type="subtitle">
          {t('totalLabel')}
        </ThemedText>
        <PriceLabel amount={o.totalAmount} />

        {(shipmentsQ.data ?? []).length > 0 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <ThemedText type="subtitle">{t('shipmentSection')}</ThemedText>
            {(shipmentsQ.data ?? []).map((s) => (
              <View key={s.id} style={[styles.card, { borderColor: border }]}>
                <ThemedText>
                  {t('shipmentStatusLabel')}: {formatShipmentStatus(s.status, language)}
                </ThemedText>
                <ThemedText>
                  {t('shipmentCarrier')}: {s.carrier}
                </ThemedText>
                {s.trackingCode ? (
                  <ThemedText>
                    {t('shipmentTracking')}: {s.trackingCode}
                  </ThemedText>
                ) : null}
                {s.estimatedDelivery ? (
                  <ThemedText style={styles.small}>
                    {t('shipmentEst')}: {s.estimatedDelivery}
                  </ThemedText>
                ) : null}
                {s.sellerId === me.data?.id && NEXT_SHIPMENT[s.status].length > 0 ? (
                  <Pressable onPress={() => setStatusModal(s)} style={[styles.linkBtn, { borderColor: tint }]}>
                    <ThemedText type="link">{t('shipmentUpdateStatus')}</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {(o.items ?? []).map((line) => {
          const thumb = line.product?.media?.[0]?.thumbnailUrl ?? line.product?.media?.[0]?.url;
          return (
          <View key={line.id} style={[styles.line, { borderColor: border }]}>
            <View style={styles.lineRow}>
              {thumb ? <Image source={{ uri: thumb }} style={styles.lineThumb} contentFit="cover" /> : null}
              <View style={styles.lineBody}>
            <ThemedText>{line.productTitleSnapshot}</ThemedText>
            <ThemedText>
              x{line.quantity} · <PriceLabel amount={line.priceSnapshot} />
            </ThemedText>
            {isBuyer && o.status === 'DELIVERED' && line.rated !== true ? (
              <Pressable
                onPress={() => {
                  setRatingScore(5);
                  setRatingText('');
                  setRatingModal({
                    productId: line.productId,
                    orderProductId: line.id,
                    title: line.productTitleSnapshot,
                  });
                }}
                style={{ marginTop: 8 }}>
                <ThemedText type="link">{t('ratingAdd')}</ThemedText>
              </Pressable>
            ) : null}
            {isBuyer && line.rated ? (
              <ThemedText style={styles.small}>{t('ratingDone')}</ThemedText>
            ) : null}
              </View>
            </View>
          </View>
        );
        })}

        {isBuyer && o.status === 'PENDING' ? (
          <Pressable
            style={[styles.btn, { borderColor: '#b91c1c', opacity: cancel.isPending ? 0.6 : 1 }]}
            disabled={cancel.isPending}
            onPress={() => cancel.mutate()}>
            <ThemedText style={{ color: '#b91c1c' }}>{t('orderCancel')}</ThemedText>
          </Pressable>
        ) : null}
        {isSeller && o.status === 'PENDING' ? (
          <Pressable
            style={[styles.btn, { backgroundColor: tint, opacity: confirm.isPending ? 0.6 : 1 }]}
            disabled={confirm.isPending}
            onPress={() => confirm.mutate()}>
            <ThemedText style={[styles.btnW, { color: onCta }]}>{t('orderConfirm')}</ThemedText>
          </Pressable>
        ) : null}
        {canCreateShipment ? (
          <Pressable style={[styles.btn, { backgroundColor: success }]} onPress={() => setShipModal(true)}>
            <ThemedText style={[styles.btnW, { color: onCta }]}>{t('orderShipmentCreate')}</ThemedText>
          </Pressable>
        ) : null}
        {isBuyer && o.status === 'SHIPPING' && (shipmentsQ.data?.length ?? 0) > 0 ? (
          <Pressable
            style={[styles.btn, { backgroundColor: tint, opacity: received.isPending ? 0.6 : 1 }]}
            disabled={received.isPending}
            onPress={() =>
              Alert.alert(t('orderReceivedConfirmTitle'), t('orderReceivedConfirmBody'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('orderReceived'), onPress: () => received.mutate() },
              ])
            }>
            <ThemedText style={[styles.btnW, { color: onCta }]}>{t('orderReceived')}</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={shipModal} animationType="slide" transparent onRequestClose={() => setShipModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShipModal(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: card, borderColor: border }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{t('orderShipmentCreate')}</ThemedText>
            <ThemedText style={styles.small}>{t('shipmentCarrier')}</ThemedText>
            <View style={styles.rowWrap}>
              {CARRIERS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setShipCarrier(c)}
                  style={[
                    styles.chip,
                    {
                      borderColor: shipCarrier === c ? tint : border,
                      backgroundColor: shipCarrier === c ? primary : 'transparent',
                    },
                  ]}>
                  <ThemedText>{c}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.small}>{t('shipmentTracking')}</ThemedText>
            <TextInput value={shipTrack} onChangeText={setShipTrack} style={[styles.inp, { borderColor: border, color: text }]} />
            <ThemedText style={styles.small}>{t('shipmentEst')} (ISO)</ThemedText>
            <TextInput value={shipEst} onChangeText={setShipEst} placeholder="2026-05-20T12:00:00.000Z" style={[styles.inp, { borderColor: border, color: text }]} />
            <Pressable
              style={[styles.btn, { backgroundColor: tint }]}
              disabled={createShip.isPending}
              onPress={() => createShip.mutate()}>
              <ThemedText style={[styles.btnW, { color: onCta }]}>{t('save')}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!statusModal} animationType="fade" transparent onRequestClose={() => setStatusModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStatusModal(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: card, borderColor: border }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{t('shipmentUpdateStatus')}</ThemedText>
            {statusModal
              ? NEXT_SHIPMENT[statusModal.status].map((st) => (
                  <Pressable
                    key={st}
                    style={[styles.btn, { borderColor: border }]}
                    onPress={() => patchStatus.mutate({ sid: statusModal.id, st })}>
                    <ThemedText>{st}</ThemedText>
                  </Pressable>
                ))
              : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!ratingModal} animationType="slide" transparent onRequestClose={() => setRatingModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRatingModal(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: card, borderColor: border }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{ratingModal?.title}</ThemedText>
            <ThemedText style={styles.small}>{t('ratingStars')}</ThemedText>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRatingScore(n)} style={styles.starHit}>
                  <ThemedText style={{ fontSize: 28, opacity: n <= ratingScore ? 1 : 0.25 }}>★</ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={ratingText}
              onChangeText={setRatingText}
              multiline
              placeholder={t('ratingReviewPlaceholder')}
              style={[styles.inp, { borderColor: border, color: text, minHeight: 80 }]}
            />
            <Pressable
              style={[styles.btn, { backgroundColor: tint }]}
              disabled={submitRating.isPending || !ratingModal}
              onPress={() => submitRating.mutate()}>
              <ThemedText style={[styles.btnW, { color: onCta }]}>{t('ratingSubmit')}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  loginCta: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  pad: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, marginTop: 4 },
  small: { fontSize: 12, opacity: 0.8 },
  line: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, gap: 4 },
  lineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  lineThumb: { width: 56, height: 56, borderRadius: 8 },
  lineBody: { flex: 1, gap: 4 },
  btn: { marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', minHeight: 48 },
  btnW: { fontWeight: '700' },
  linkBtn: { marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  modalBackdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  inp: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15 },
  starsRow: { flexDirection: 'row', gap: 4 },
  starHit: { padding: 4 },
});
