import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/store/auth.store';
import { useTrips } from '../hooks/useTrips';
import { usePlanStore } from '../store/plan.store';
import type { TripDetailDto, TripSummaryDto } from '../types/plan';
import { formatDateRangeDisplay } from './plan-create-dates';
import { PlanEmptyCreate } from './PlanEmptyCreate';
import { PlanGuestGate } from './PlanGuestGate';
import { PlanTimeline } from './PlanTimeline';

/** Matches Explore category chips: below map back + search row. */
const HEADER_CLEARANCE = 62;
/** Fallback picker height before onLayout (header + trip chips). */
const PICKER_HEIGHT_FALLBACK = 96;
const PICKER_SHEET_GAP = 8;

/**
 * Plan tab orchestrator: guest gate → empty create → trip picker + day timeline.
 */
export function PlanTab() {
  const me = useAuthStore((s) => s.me);
  const isMember = me?.role === 'MEMBER';
  const setCreateOverlayOpen = usePlanStore((s) => s.setCreateOverlayOpen);

  useEffect(() => {
    if (!isMember) setCreateOverlayOpen(false);
  }, [isMember, setCreateOverlayOpen]);

  if (!isMember) {
    return <PlanGuestGate />;
  }

  return <PlanMemberFlow />;
}

function PlanMemberFlow() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const tripsQuery = useTrips({ enabled: true });
  const activeTripId = usePlanStore((s) => s.activeTripId);
  const setActiveTripId = usePlanStore((s) => s.setActiveTripId);
  const setSelectedDayId = usePlanStore((s) => s.setSelectedDayId);
  const tripList = tripsQuery.data;
  const [creating, setCreating] = useState(false);
  const [pickerHeight, setPickerHeight] = useState(PICKER_HEIGHT_FALLBACK);
  const setCreateOverlayOpen = usePlanStore((s) => s.setCreateOverlayOpen);

  const overlayOpen =
    !tripsQuery.isLoading &&
    !tripsQuery.isPending &&
    !tripsQuery.isError &&
    (creating || !tripList?.length);

  useEffect(() => {
    setCreateOverlayOpen(overlayOpen);
  }, [overlayOpen, setCreateOverlayOpen]);

  useEffect(() => {
    return () => setCreateOverlayOpen(false);
  }, [setCreateOverlayOpen]);

  useEffect(() => {
    if (!tripList?.length) {
      if (activeTripId) setActiveTripId(null);
      setSelectedDayId(null);
      setCreating(false);
      return;
    }
    const stillThere = activeTripId && tripList.some((tr) => tr.id === activeTripId);
    if (!stillThere) {
      setActiveTripId(tripList[0].id);
      setSelectedDayId(null);
    }
  }, [tripList, activeTripId, setActiveTripId, setSelectedDayId]);

  const onCreated = (trip: TripDetailDto) => {
    setCreating(false);
    setActiveTripId(trip.id);
    setSelectedDayId(null);
  };

  if (tripsQuery.isLoading || tripsQuery.isPending) {
    return (
      <View pointerEvents="none" style={styles.loading}>
        <ActivityIndicator color={tint} />
        <Text style={[styles.loadingText, { color: muted }]}>{t('planTripsLoading')}</Text>
      </View>
    );
  }

  if (tripsQuery.isError) {
    return (
      <View style={[styles.errorPanel, { top: insets.top + HEADER_CLEARANCE }]}>
        <View style={[styles.errorCard, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.errorTitle, { color: text }]}>{t('errorTitle')}</Text>
          <Text style={{ color: muted }}>{t('planTripsLoadFailed')}</Text>
          <Pressable onPress={() => void tripsQuery.refetch()}>
            <Text style={{ color: tint, fontWeight: '700', marginTop: 8 }}>{t('planRetry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!tripList?.length) {
    return <PlanEmptyCreate onCreated={onCreated} />;
  }

  if (creating) {
    return (
      <View style={styles.memberRoot} pointerEvents="box-none">
        <PlanEmptyCreate onCreated={onCreated} onCancel={() => setCreating(false)} />
      </View>
    );
  }

  const active = tripList.find((tr) => tr.id === activeTripId) ?? tripList[0];
  const pickerTop = insets.top + HEADER_CLEARANCE;
  const sheetTopInset = pickerTop + pickerHeight + PICKER_SHEET_GAP;

  return (
    <View style={styles.memberRoot} pointerEvents="box-none">
      <View
        collapsable={false}
        style={[styles.pickerSlot, { top: pickerTop }]}
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.height);
          if (next > 0 && next !== pickerHeight) setPickerHeight(next);
        }}>
        <TripPickerBar
          trips={tripList}
          activeTripId={active.id}
          onSelect={setActiveTripId}
          onCreate={() => setCreating(true)}
        />
      </View>

      <View style={styles.timelineSlot} pointerEvents="box-none">
        <PlanTimeline
          tripId={active.id}
          tripTitle={active.title}
          sheetTopInset={sheetTopInset}
        />
      </View>
    </View>
  );
}

function TripPickerBar({
  trips,
  activeTripId,
  onSelect,
  onCreate,
}: {
  trips: TripSummaryDto[];
  activeTripId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const { t, language } = useI18n();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <View style={[styles.pickerPanel, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerLabel, { color: muted }]}>{t('planPickTrip')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planCreateNewTrip')}
          onPress={onCreate}
          hitSlop={8}
          style={[styles.addBtn, { borderColor: tint }]}>
          <MaterialIcons name="add" size={20} color={tint} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pickerRow}>
        {trips.map((trip) => {
          const active = trip.id === activeTripId;
          return (
            <Pressable
              key={trip.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(trip.id)}
              style={[
                styles.tripChip,
                {
                  borderColor: active ? tint : border,
                  backgroundColor: active ? `${tint}18` : 'transparent',
                },
              ]}>
              <Text
                numberOfLines={1}
                style={{ color: active ? tint : text, fontWeight: '600', fontSize: 13 }}>
                {trip.title}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: active ? tint : muted, fontSize: 11, fontWeight: '500' }}>
                {formatDateRangeDisplay(trip.startDate, trip.endDate, locale)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  memberRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 30,
  },
  loadingText: { fontSize: 13 },
  errorPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 4,
  },
  errorTitle: { fontSize: 16, fontWeight: '700' },
  pickerSlot: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 32,
    elevation: 32,
  },
  timelineSlot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  pickerPanel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pickerLabel: { fontSize: 11, fontWeight: '600' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: { gap: 8, paddingRight: 4 },
  tripChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
    gap: 2,
  },
});
