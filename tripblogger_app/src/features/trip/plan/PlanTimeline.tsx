import BottomSheet from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useTripDetail } from '../hooks/useTripDetail';
import { useMoveStopMutation } from '../hooks/useTripMutations';
import type { TripStopDto } from '../types/plan';
import { PlanDayChips, type PlanDaySelection } from './PlanDayChips';
import { PlanStopCard } from './PlanStopCard';
import { PlanTravelConnector } from './PlanTravelConnector';

const FULL_INDEX = 2;
const SNAP_POINTS = ['18%', '50%', '92%'] as const;
/** Matches TripBottomNav bar height above safe-area padding. */
const NAV_BAR_OFFSET = 56;

type Props = {
  tripId: string;
  tripTitle: string;
};

/**
 * Plan sheet: day chips + draggable stop timeline with travel connectors.
 * Gesture rules from Task 11 — drag only when sheet is full; lock sheet pan while dragging.
 */
export function PlanTimeline({ tripId, tripTitle }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const detailQuery = useTripDetail(tripId);
  const moveStop = useMoveStopMutation();

  const trip = detailQuery.data;
  const days = useMemo(() => trip?.days ?? [], [trip?.days]);

  const [selection, setSelection] = useState<PlanDaySelection | null>(null);
  const [sheetIndex, setSheetIndex] = useState(1);
  const [dragging, setDragging] = useState(false);
  /** Local order while move is in flight; null = follow server. */
  const [optimisticStops, setOptimisticStops] = useState<TripStopDto[] | null>(null);

  useEffect(() => {
    if (!days.length) {
      setSelection({ kind: 'ideas' });
      return;
    }
    setSelection((prev) => {
      if (prev?.kind === 'ideas') return prev;
      if (prev?.kind === 'day' && days.some((d) => d.id === prev.dayId)) return prev;
      return { kind: 'day', dayId: days[0].id };
    });
  }, [days]);

  const resolvedSelection = useMemo<PlanDaySelection>(() => {
    if (selection) return selection;
    return days[0] ? { kind: 'day', dayId: days[0].id } : { kind: 'ideas' };
  }, [selection, days]);

  const selectedDay = useMemo(() => {
    if (resolvedSelection.kind !== 'day') return null;
    return days.find((d) => d.id === resolvedSelection.dayId) ?? null;
  }, [days, resolvedSelection]);

  const serverStops = useMemo(() => {
    if (resolvedSelection.kind === 'ideas') return trip?.ideaStops ?? [];
    return selectedDay?.stops ?? [];
  }, [resolvedSelection.kind, selectedDay?.stops, trip?.ideaStops]);

  useEffect(() => {
    if (!moveStop.isPending) {
      setOptimisticStops(null);
    }
  }, [serverStops, moveStop.isPending]);

  const stops = optimisticStops ?? serverStops;
  const isIdeas = resolvedSelection.kind === 'ideas';
  const defaultBuffer = trip?.defaultBufferMinutes ?? 15;
  const travelPending = moveStop.isPending && !isIdeas;

  const snapPoints = useMemo(() => [...SNAP_POINTS], []);
  const canDrag = sheetIndex === FULL_INDEX;
  const enableContentPanning = sheetIndex !== FULL_INDEX && !dragging;
  const enableHandlePanning = !dragging;
  const bottomInset = Math.max(insets.bottom, 8) + NAV_BAR_OFFSET;

  const endDrag = useCallback(() => setDragging(false), []);

  const onDragEnd = useCallback(
    ({ data: next, from, to }: { data: TripStopDto[]; from: number; to: number }) => {
      setDragging(false);
      if (from === to) return;

      const movedStop = next[to];
      if (!movedStop || !trip) return;

      const nulled = isIdeas
        ? next
        : next.map((s, i) =>
            i === 0
              ? s
              : {
                  ...s,
                  travelFromPrevSeconds: null,
                  travelFromPrevDistanceM: null,
                  schedule: null,
                  conflicts: [],
                },
          );

      setOptimisticStops(nulled);

      moveStop.mutate(
        {
          tripId,
          stopId: movedStop.id,
          dto: {
            toTripDayId: isIdeas ? null : selectedDay?.id ?? null,
            toPosition: to,
          },
        },
        {
          onError: () => {
            setOptimisticStops(null);
          },
        },
      );
    },
    [isIdeas, moveStop, selectedDay?.id, trip, tripId],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<TripStopDto>) => {
      const index = getIndex() ?? 0;
      const prev = index > 0 ? stops[index - 1] : null;
      const bufferMinutes = prev ? (prev.bufferAfterMinutes ?? defaultBuffer) : 0;
      const showConnector = index > 0 && !isIdeas;
      const calculating =
        showConnector && travelPending && item.travelFromPrevSeconds == null;

      return (
        <ScaleDecorator>
          <View>
            {showConnector ? (
              <PlanTravelConnector
                travelFromPrevSeconds={item.travelFromPrevSeconds}
                bufferMinutes={bufferMinutes}
                calculating={calculating}
              />
            ) : null}
            <PlanStopCard
              stop={item}
              showTime={!isIdeas}
              canDrag={canDrag}
              isActive={isActive}
              onLongPress={canDrag ? drag : undefined}
            />
          </View>
        </ScaleDecorator>
      );
    },
    [canDrag, defaultBuffer, isIdeas, stops, travelPending],
  );

  const listHeader = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: text }]} numberOfLines={1}>
        {tripTitle.trim() || t('mapTabPlan')}
      </Text>
      <Text style={[styles.sub, { color: muted }]}>
        {canDrag ? t('planPrototypeHintFull') : t('planPrototypeHintPeek')}
      </Text>
      {trip ? (
        <PlanDayChips
          days={days}
          selection={resolvedSelection}
          onSelect={(next) => {
            setOptimisticStops(null);
            setSelection(next);
          }}
          ideaCount={trip.ideaStops.length}
        />
      ) : null}
    </View>
  );

  if (detailQuery.isLoading || detailQuery.isPending) {
    return (
      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        bottomInset={bottomInset}
        backgroundStyle={{
          backgroundColor: surface,
          borderTopColor: border,
          borderTopWidth: StyleSheet.hairlineWidth,
        }}
        handleIndicatorStyle={{ backgroundColor: muted }}
        style={styles.sheet}>
        <View style={styles.loading}>
          <ActivityIndicator color={tint} />
          <Text style={{ color: muted }}>{t('planTripsLoading')}</Text>
        </View>
      </BottomSheet>
    );
  }

  if (detailQuery.isError || !trip) {
    return (
      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        bottomInset={bottomInset}
        backgroundStyle={{
          backgroundColor: surface,
          borderTopColor: border,
          borderTopWidth: StyleSheet.hairlineWidth,
        }}
        handleIndicatorStyle={{ backgroundColor: muted }}
        style={styles.sheet}>
        <View style={styles.loading}>
          <Text style={{ color: text }}>{t('planTripsLoadFailed')}</Text>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      index={1}
      snapPoints={snapPoints}
      onChange={setSheetIndex}
      enableDynamicSizing={false}
      enablePanDownToClose={false}
      enableContentPanningGesture={enableContentPanning}
      enableHandlePanningGesture={enableHandlePanning}
      bottomInset={bottomInset}
      backgroundStyle={{
        backgroundColor: surface,
        borderTopColor: border,
        borderTopWidth: StyleSheet.hairlineWidth,
      }}
      handleIndicatorStyle={{ backgroundColor: muted }}
      style={styles.sheet}>
      <DraggableFlatList
        data={stops}
        keyExtractor={(item) => item.id}
        onDragBegin={() => setDragging(true)}
        onDragEnd={onDragEnd}
        onRelease={endDrag}
        activationDistance={canDrag ? 8 : 10_000}
        containerStyle={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={[styles.empty, { color: muted }]}>—</Text>}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    zIndex: 30,
    elevation: 30,
  },
  header: {
    paddingTop: 0,
    paddingBottom: 4,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  sub: {
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 28 },
  loading: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 13,
  },
});
