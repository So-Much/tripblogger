import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/store/auth.store';
import { useTrips } from '../hooks/useTrips';
import type { TripDetailDto, TripSummaryDto } from '../types/plan';
import { PlanEmptyCreate } from './PlanEmptyCreate';
import { PlanGuestGate } from './PlanGuestGate';
import { PlanTimeline } from './PlanTimeline';

/**
 * Plan tab orchestrator: guest gate → empty create → trip picker + day timeline.
 */
export function PlanTab() {
  const me = useAuthStore((s) => s.me);
  const isMember = me?.role === 'MEMBER';

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
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const tripList = tripsQuery.data;

  useEffect(() => {
    if (!tripList?.length) {
      if (activeTripId) setActiveTripId(null);
      return;
    }
    const stillThere = activeTripId && tripList.some((tr) => tr.id === activeTripId);
    if (!stillThere) {
      setActiveTripId(tripList[0].id);
    }
  }, [tripList, activeTripId]);

  const onCreated = (trip: TripDetailDto) => {
    setActiveTripId(trip.id);
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
      <View style={[styles.errorPanel, { top: insets.top + 72 }]}>
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

  const active = tripList.find((tr) => tr.id === activeTripId) ?? tripList[0];

  return (
    <>
      <TripPickerBar
        trips={tripList}
        activeTripId={active.id}
        onSelect={setActiveTripId}
      />
      <PlanTimeline key={active.id} tripId={active.id} tripTitle={active.title} />
    </>
  );
}

function TripPickerBar({
  trips,
  activeTripId,
  onSelect,
}: {
  trips: TripSummaryDto[];
  activeTripId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  return (
    <View
      pointerEvents="box-none"
      style={[styles.pickerWrap, { top: insets.top + 56 }]}>
      <View style={[styles.pickerPanel, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.pickerLabel, { color: muted }]}>{t('planPickTrip')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerRow}>
          {trips.map((trip) => {
            const active = trip.id === activeTripId;
            return (
              <Pressable
                key={trip.id}
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
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pickerWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 28,
    elevation: 28,
  },
  pickerPanel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pickerLabel: { fontSize: 11, fontWeight: '600' },
  pickerRow: { gap: 8, paddingRight: 4 },
  tripChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 200,
  },
});
