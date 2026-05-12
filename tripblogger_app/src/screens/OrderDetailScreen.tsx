import { useMemo, useState } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
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
  const { t } = useI18n();
  const qc = useQueryClient();
  const me = useMeQuery();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const card = useThemeColor({}, 'card');

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

  const q = useQuery({
    queryKey: ['commerce', 'order', id],
    queryFn: () => commerceService.getOrder(String(id)),
    enabled: !!id && me.data?.role === 'MEMBER',
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

  if (!id || me.data?.role !== 'MEMBER') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
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
          {t('orderStatus')}: {o.status}
        </ThemedText>

        {o.payment ? (
          <View style={[styles.card, { borderColor: border }]}>
            <ThemedText type="subtitle">{t('paymentSection')}</ThemedText>
            <ThemedText>
              {t('paymentMethod')}: {o.payment.method}
            </ThemedText>
            <ThemedText>
              {t('paymentStatus')}: {o.payment.status}
            </ThemedText>
            <PriceLabel amount={o.payment.amount} />
            {o.payment.paidAt ? (
              <ThemedText style={styles.small}>
                {t('paymentPaidAt')}: {o.payment.paidAt}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {o.address ? (
          <View style={[styles.card, { borderColor: border }]}>
            <ThemedText type="subtitle">{t('addressSection')}</ThemedText>
            <ThemedText>{o.address.recipientName}</ThemedText>
            <ThemedText style={styles.small}>
              {o.address.street}, {o.address.ward}, {o.address.district}, {o.address.province}
            </ThemedText>
            <ThemedText style={styles.small}>{o.address.phone}</ThemedText>
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
                  {t('shipmentStatusLabel')}: {s.status}
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

        {(o.items ?? []).map((line) => (
          <View key={line.id} style={[styles.line, { borderColor: border }]}>
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
        ))}

        {isBuyer && o.status === 'PENDING' ? (
          <Pressable style={[styles.btn, { borderColor: '#b91c1c' }]} onPress={() => cancel.mutate()}>
            <ThemedText style={{ color: '#b91c1c' }}>{t('orderCancel')}</ThemedText>
          </Pressable>
        ) : null}
        {isSeller && o.status === 'PENDING' ? (
          <Pressable style={[styles.btn, { backgroundColor: tint }]} onPress={() => confirm.mutate()}>
            <ThemedText style={styles.btnW}>{t('orderConfirm')}</ThemedText>
          </Pressable>
        ) : null}
        {canCreateShipment ? (
          <Pressable style={[styles.btn, { backgroundColor: '#166534' }]} onPress={() => setShipModal(true)}>
            <ThemedText style={styles.btnW}>{t('orderShipmentCreate')}</ThemedText>
          </Pressable>
        ) : null}
        {isBuyer && o.status === 'SHIPPING' ? (
          <Pressable style={[styles.btn, { backgroundColor: tint }]} onPress={() => received.mutate()}>
            <ThemedText style={styles.btnW}>{t('orderReceived')}</ThemedText>
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
                  style={[styles.chip, { borderColor: shipCarrier === c ? tint : border }]}>
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
              <ThemedText style={styles.btnW}>{t('save')}</ThemedText>
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
              <ThemedText style={styles.btnW}>{t('ratingSubmit')}</ThemedText>
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
  pad: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 6, marginTop: 4 },
  small: { fontSize: 12, opacity: 0.8 },
  line: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, gap: 4 },
  btn: { marginTop: 12, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnW: { color: '#fff', fontWeight: '700' },
  linkBtn: { marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  modalBackdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  inp: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15 },
  starsRow: { flexDirection: 'row', gap: 4 },
  starHit: { padding: 4 },
});
