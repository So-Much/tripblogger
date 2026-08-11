import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { useTripDetail } from '../hooks/useTripDetail';
import { useAddStopMutation } from '../hooks/useTripMutations';
import { useTrips } from '../hooks/useTrips';
import { usePlanStore } from '../store/plan.store';
import type { MapPlace } from '../types/map';
import type { AddStopDto } from '../types/plan';

type Props = {
  visible: boolean;
  place: MapPlace | null;
  onClose: () => void;
};

/**
 * Day / idea-bucket picker for adding a map place into the active trip.
 */
export function PlanAddDayPicker({ visible, place, onClose }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');

  const activeTripId = usePlanStore((s) => s.activeTripId);
  const setActiveTripId = usePlanStore((s) => s.setActiveTripId);
  const setSelectedDayId = usePlanStore((s) => s.setSelectedDayId);

  const tripsQuery = useTrips({ enabled: visible });
  const tripList = tripsQuery.data;
  const resolvedTripId = useMemo(() => {
    if (!tripList?.length) return null;
    if (activeTripId && tripList.some((tr) => tr.id === activeTripId)) {
      return activeTripId;
    }
    return tripList[0].id;
  }, [tripList, activeTripId]);

  useEffect(() => {
    if (!visible || !resolvedTripId) return;
    if (resolvedTripId !== activeTripId) {
      setActiveTripId(resolvedTripId);
    }
  }, [visible, resolvedTripId, activeTripId, setActiveTripId]);

  const detailQuery = useTripDetail(visible ? resolvedTripId : null);
  const addStop = useAddStopMutation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  const days = detailQuery.data?.days ?? [];
  const tripTitle = detailQuery.data?.title ?? tripList?.find((tr) => tr.id === resolvedTripId)?.title;

  const submit = (tripDayId: string | null) => {
    if (!place || !resolvedTripId) return;
    setError(null);
    const dto: AddStopDto = {
      place: {
        id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        category: place.category,
        openingHours: place.openingHours,
        source: place.source,
      },
      tripDayId,
    };
    addStop.mutate(
      { tripId: resolvedTripId, dto },
      {
        onSuccess: () => {
          if (tripDayId) setSelectedDayId(tripDayId);
          onClose();
        },
        onError: (err) => {
          setError(formatApiError(err, t('planCreateFailed')));
        },
      },
    );
  };

  const busy = addStop.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: surface,
            borderColor: border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <Text style={[styles.title, { color: text }]}>{t('planPickDay')}</Text>
        {tripTitle ? (
          <Text style={[styles.sub, { color: muted }]} numberOfLines={1}>
            {tripTitle}
          </Text>
        ) : null}

        {tripsQuery.isLoading || detailQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tint} />
          </View>
        ) : !resolvedTripId ? (
          <Text style={{ color: muted, marginTop: 12 }}>{t('planEmptyBody')}</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}>
            {days.map((day) => (
              <Pressable
                key={day.id}
                disabled={busy}
                onPress={() => submit(day.id)}
                style={[
                  styles.chip,
                  { borderColor: tint, backgroundColor: `${tint}18`, opacity: busy ? 0.6 : 1 },
                ]}>
                <Text style={{ color: tint, fontWeight: '700', fontSize: 13 }}>
                  {t('planDayChip', { day: day.dayIndex + 1 })}
                </Text>
                <Text style={{ color: muted, fontSize: 11 }}>{day.date.slice(5)}</Text>
              </Pressable>
            ))}
            <Pressable
              disabled={busy}
              onPress={() => submit(null)}
              style={[
                styles.chip,
                { borderColor: border, opacity: busy ? 0.6 : 1 },
              ]}>
              <Text style={{ color: text, fontWeight: '700', fontSize: 13 }}>
                {t('planIdeaBucket')}
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={tint} />
          </View>
        ) : null}
        {error ? <Text style={{ color: danger, marginTop: 8 }}>{error}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 4,
  },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13, marginBottom: 8 },
  center: { paddingVertical: 24, alignItems: 'center' },
  row: { gap: 8, paddingVertical: 12, paddingRight: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 84,
    gap: 2,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    minHeight: 28,
  },
});
