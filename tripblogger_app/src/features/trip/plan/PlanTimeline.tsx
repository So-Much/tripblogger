import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetHandle,
  BottomSheetModalProvider,
  useBottomSheet,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { tripKeys } from '../hooks/trip-query-keys';
import { useTripDetail } from '../hooks/useTripDetail';
import {
  useDeleteStopMutation,
  useMoveStopMutation,
  usePatchStopMutation,
} from '../hooks/useTripMutations';
import { useMapStore } from '../store/map.store';
import { usePlanStore } from '../store/plan.store';
import type { PatchStopDto, ScheduleConflict, TripDetailDto, TripStopDto } from '../types/plan';
import { applyLocalStopPatch } from './applyLocalDaySchedule';
import { PlanConflictActions } from './PlanConflictActions';
import { PlanDayChips, type PlanDaySelection } from './PlanDayChips';
import { PlanOverview } from './PlanOverview';
import { PlanStopCard } from './PlanStopCard';
import { PlanStopDetailSheet } from './PlanStopDetailSheet';
import { PlanTravelConnector } from './PlanTravelConnector';
import { planDayColor } from './plan-day-color';
import { planStopDeleteTarget } from './plan-stop-delete';
import { clampBufferMinutes, travelMinutesToSeconds } from './plan-travel-minutes';
import {
  PLAN_HOST_SWAP_DEBOUNCE_MS,
  planSheetGesturePolicy,
  planSheetSnapPoints,
  resolvePlanSheetHost,
  samePlanSheetTab,
  wantedPlanSheetHost,
  type PlanSheetHostKind,
} from './plan-sheet-layout';

/** Matches TripBottomNav bar height above safe-area padding. */
const NAV_BAR_OFFSET = 56;
/** Grabber padding until handle onLayout; gorhom handle is ~24px. */
const HANDLE_HEIGHT_FALLBACK = 24;

function PlanVisibleListFrame({
  containerHeight,
  handleHeight,
  children,
}: {
  containerHeight: number;
  handleHeight: number;
  children: ReactNode;
}) {
  const { animatedPosition } = useBottomSheet();
  const chrome = handleHeight > 0 ? handleHeight : HANDLE_HEIGHT_FALLBACK;
  const frameStyle = useAnimatedStyle(() => {
    const visible = Math.max(0, containerHeight - animatedPosition.value);
    return { height: Math.max(0, Math.round(visible - chrome)) };
  }, [containerHeight, chrome]);

  return (
    <Animated.View collapsable={false} style={[styles.listFrame, frameStyle]}>
      {children}
    </Animated.View>
  );
}

type Props = {
  tripId: string;
  tripTitle: string;
  /** Keeps the sheet below the trip switcher so 92% snap cannot cover chips. */
  sheetTopInset?: number;
};

/**
 * Plan sheet: day chips + stop timeline with travel connectors.
 * Handle / title pan the sheet. The itinerary list viewport is the
 * *visible* snap height (not the full sheet), so peek/mid can scroll.
 * Reorder only when fully expanded; lock sheet pan while dragging a row.
 */
export function PlanTimeline({ tripId, tripTitle, sheetTopInset = 0 }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const onCta = useThemeColor({}, 'onCta');

  const queryClient = useQueryClient();
  const detailQuery = useTripDetail(tripId);
  const moveStop = useMoveStopMutation();
  const patchStop = usePatchStopMutation();
  const deleteStop = useDeleteStopMutation();

  const trip = detailQuery.data;
  const days = useMemo(() => trip?.days ?? [], [trip?.days]);

  const setPlanMapSelection = usePlanStore((s) => s.setPlanMapSelection);
  const focusedStopId = usePlanStore((s) => s.focusedStopId);
  const setFocusedStopId = usePlanStore((s) => s.setFocusedStopId);
  const setCameraFocusStop = usePlanStore((s) => s.setCameraFocusStop);
  const revealDayId = usePlanStore((s) => s.revealDayId);
  const setRevealDayId = usePlanStore((s) => s.setRevealDayId);
  const planTabActive = useMapStore((s) => s.bottomTab === 'plan');
  const searchOverlay = useMapStore((s) => s.searchOpen && s.activeSheet === 'search');
  const [selection, setSelection] = useState<PlanDaySelection | null>(null);
  const [sheetIndex, setSheetIndex] = useState(1);
  const [handleHeight, setHandleHeight] = useState(HANDLE_HEIGHT_FALLBACK);
  const [dragging, setDragging] = useState(false);
  /** Local order while move is in flight; null = follow server. */
  const [optimisticStops, setOptimisticStops] = useState<TripStopDto[] | null>(null);
  const [detailStopId, setDetailStopId] = useState<string | null>(null);
  const [conflictTarget, setConflictTarget] = useState<{
    stopId: string;
    conflict: ScheduleConflict;
  } | null>(null);

  useEffect(() => {
    setSelection(null);
    setDragging(false);
    setOptimisticStops(null);
    setDetailStopId(null);
    setConflictTarget(null);
  }, [tripId]);

  useEffect(() => {
    if (!days.length) {
      setSelection({ kind: 'ideas' });
      return;
    }
    setSelection((prev) => {
      if (prev?.kind === 'ideas' || prev?.kind === 'overview') return prev;
      if (prev?.kind === 'day' && days.some((d) => d.id === prev.dayId)) return prev;
      return { kind: 'day', dayId: days[0].id };
    });
  }, [days]);

  useEffect(() => {
    if (!revealDayId) return;
    if (days.some((d) => d.id === revealDayId)) {
      setSelection({ kind: 'day', dayId: revealDayId });
    }
    setRevealDayId(null);
  }, [revealDayId, days, setRevealDayId]);

  const resolvedSelection = useMemo<PlanDaySelection>(() => {
    if (selection) return selection;
    return days[0] ? { kind: 'day', dayId: days[0].id } : { kind: 'ideas' };
  }, [selection, days]);

  const applyMapSelection = useCallback(
    (next: PlanDaySelection) => {
      if (next.kind === 'day') {
        setPlanMapSelection('day', next.dayId);
      } else if (next.kind === 'overview') {
        setPlanMapSelection('overview', null);
      } else {
        setPlanMapSelection('ideas', null);
      }
    },
    [setPlanMapSelection],
  );

  useEffect(() => {
    applyMapSelection(resolvedSelection);
  }, [resolvedSelection, applyMapSelection]);
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
  const isOverview = resolvedSelection.kind === 'overview';
  const defaultBuffer = trip?.defaultBufferMinutes ?? 15;
  const travelPending = moveStop.isPending && !isIdeas;

  const allStops = useMemo(() => {
    if (!trip) return [] as TripStopDto[];
    return [...trip.days.flatMap((d) => d.stops), ...trip.ideaStops];
  }, [trip]);

  const detailStop = useMemo(
    () => (detailStopId ? allStops.find((s) => s.id === detailStopId) ?? null : null),
    [allStops, detailStopId],
  );

  useEffect(() => {
    if (!focusedStopId) return;
    if (allStops.some((s) => s.id === focusedStopId)) {
      setDetailStopId(focusedStopId);
    }
    setFocusedStopId(null);
  }, [allStops, focusedStopId, setFocusedStopId]);

  const detailPrevStop = useMemo(() => {
    if (!detailStop || !trip || detailStop.tripDayId == null) return null;
    const day = trip.days.find((d) => d.id === detailStop.tripDayId);
    if (!day) return null;
    const idx = day.stops.findIndex((s) => s.id === detailStop.id);
    if (idx <= 0) return null;
    return day.stops[idx - 1] ?? null;
  }, [detailStop, trip]);

  const applyStopPatch = useCallback(
    (stopId: string, dto: PatchStopDto) => {
      queryClient.setQueryData<TripDetailDto>(tripKeys.detail(tripId), (old) =>
        old ? applyLocalStopPatch(old, stopId, dto) : old,
      );
      patchStop.mutate(
        { tripId, stopId, dto },
        {
          onError: () => {
            void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
          },
        },
      );
    },
    [patchStop, queryClient, tripId],
  );

  const requestDelete = useCallback(
    (item: TripStopDto) => {
      const target = planStopDeleteTarget(item);
      Alert.alert(t(target.titleKey), target.message, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('planDeleteStop'),
          style: 'destructive',
          onPress: () => {
            deleteStop.mutate(
              { tripId, stopId: target.stopId },
              {
                onSuccess: () => {
                  setDetailStopId((id) => (id === target.stopId ? null : id));
                },
              },
            );
          },
        },
      ]);
    },
    [deleteStop, t, tripId],
  );

  const conflictStop = useMemo(
    () =>
      conflictTarget
        ? allStops.find((s) => s.id === conflictTarget.stopId) ?? null
        : null,
    [allStops, conflictTarget],
  );

  const bottomInset = Math.max(insets.bottom, 8) + NAV_BAR_OFFSET;
  const sheetContainerHeight = Math.max(0, windowHeight - bottomInset);
  const snapPoints = useMemo(() => {
    const available = Math.max(180, windowHeight - sheetTopInset - bottomInset);
    return planSheetSnapPoints(available);
  }, [windowHeight, sheetTopInset, bottomInset]);
  const gesturesEnabled = planTabActive && !searchOverlay && detailStopId == null;
  const policy = planSheetGesturePolicy({
    sheetIndex,
    dragging,
    gesturesEnabled,
  });
  const canDrag = policy.canDragReorder;
  const wantedHost: PlanSheetHostKind = wantedPlanSheetHost({
    tabKind: resolvedSelection.kind,
    listKind: policy.listKind,
  });
  const [listHost, setListHost] = useState<PlanSheetHostKind>(wantedHost);

  useEffect(() => {
    if (dragging) {
      setListHost((current) =>
        resolvePlanSheetHost({ wanted: wantedHost, current, dragging: true }),
      );
      return;
    }
    const timer = setTimeout(() => {
      setListHost((current) =>
        resolvePlanSheetHost({ wanted: wantedHost, current, dragging: false }),
      );
    }, PLAN_HOST_SWAP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dragging, wantedHost]);

  const endDrag = useCallback(() => setDragging(false), []);

  const onDragEnd = useCallback(
    ({ data: next, from, to }: { data: TripStopDto[]; from: number; to: number }) => {
      setDragging(false);
      if (moveStop.isPending) return;
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

  const renderStop = useCallback(
    (
      item: TripStopDto,
      index: number,
      dragOpts?: { drag: () => void; isActive: boolean },
    ) => {
      const isActive = dragOpts?.isActive ?? false;
      const prev = index > 0 ? stops[index - 1] : null;
      const bufferMinutes = prev ? (prev.bufferAfterMinutes ?? defaultBuffer) : 0;
      const showConnector = index > 0 && !isIdeas;
      const calculating =
        showConnector && travelPending && item.travelFromPrevSeconds == null;
      const swipeEnabled = !canDrag && !isActive;

      const card = (
        <PlanStopCard
          stop={item}
          showTime={!isIdeas}
          stopIndex={isIdeas ? null : index + 1}
          indexColor={
            selectedDay != null ? planDayColor(selectedDay.dayIndex) : undefined
          }
          canDrag={canDrag}
          isActive={isActive}
          onPress={() => {
            if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
              setCameraFocusStop({ id: item.id, lat: item.lat, lng: item.lng });
            }
          }}
          onSettingsPress={() => setDetailStopId(item.id)}
          onDeletePress={() => requestDelete(item)}
          onConflictPress={(conflict) =>
            setConflictTarget({ stopId: item.id, conflict })
          }
          onLongPress={canDrag && dragOpts ? dragOpts.drag : undefined}
        />
      );

      const row = (
        <View>
          {showConnector ? (
            <PlanTravelConnector
              travelFromPrevSeconds={item.travelFromPrevSeconds}
              bufferMinutes={bufferMinutes}
              calculating={calculating}
              editable={!calculating}
              disabled={patchStop.isPending}
              onTravelMinutesChange={(minutes) =>
                applyStopPatch(item.id, {
                  travelFromPrevSeconds: travelMinutesToSeconds(minutes),
                })
              }
              onBufferMinutesChange={
                prev
                  ? (minutes) =>
                      applyStopPatch(prev.id, {
                        bufferAfterMinutes: clampBufferMinutes(minutes),
                      })
                  : undefined
              }
            />
          ) : null}
          {swipeEnabled ? (
            <Swipeable
              overshootRight={false}
              friction={2}
              renderRightActions={() => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planDeleteStop')}
                  onPress={() => requestDelete(item)}
                  style={[styles.swipeDelete, { backgroundColor: danger }]}>
                  <MaterialIcons name="delete-outline" size={22} color={onCta} />
                  <Text style={[styles.swipeDeleteText, { color: onCta }]}>
                    {t('planSwipeDelete')}
                  </Text>
                </Pressable>
              )}>
              {card}
            </Swipeable>
          ) : (
            card
          )}
        </View>
      );

      return dragOpts ? <ScaleDecorator>{row}</ScaleDecorator> : row;
    },
    [
      applyStopPatch,
      canDrag,
      danger,
      defaultBuffer,
      isIdeas,
      onCta,
      patchStop.isPending,
      requestDelete,
      selectedDay,
      setCameraFocusStop,
      stops,
      t,
      travelPending,
    ],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<TripStopDto>) => {
      const index = getIndex() ?? 0;
      return renderStop(item, index, { drag, isActive });
    },
    [renderStop],
  );

  const onHandleLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.height);
    if (next > 0) {
      setHandleHeight((prev) => (prev === next ? prev : next));
    }
  }, []);

  const renderHandle = useCallback(
    (handleProps: BottomSheetHandleProps) => (
      <View collapsable={false} onLayout={onHandleLayout}>
        <BottomSheetHandle {...handleProps}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]} numberOfLines={1}>
              {tripTitle.trim() || t('mapTabPlan')}
            </Text>
            <Text style={[styles.sub, { color: muted }]}>
              {isOverview
                ? t('planOverviewHint')
                : canDrag
                  ? t('planPrototypeHintFull')
                  : t('planPrototypeHintPeek')}
            </Text>
          </View>
        </BottomSheetHandle>
      </View>
    ),
    [canDrag, isOverview, muted, onHandleLayout, t, text, tripTitle],
  );

  const chipsHeader =
    trip != null ? (
      <PlanDayChips
        days={days}
        selection={resolvedSelection}
        onSelect={(next) => {
          if (samePlanSheetTab(resolvedSelection, next)) return;
          setOptimisticStops(null);
          setSelection(next);
        }}
        ideaCount={trip.ideaStops.length}
      />
    ) : null;

  const selectOverviewDay = (dayId: string) => {
    if (samePlanSheetTab(resolvedSelection, { kind: 'day', dayId })) return;
    setOptimisticStops(null);
    setSelection({ kind: 'day', dayId });
  };

  const overviewHeader = isOverview ? (
    <PlanOverview days={days} onSelectDay={selectOverviewDay} />
  ) : null;

  const itineraryData = isOverview ? [] : stops;

  return (
    <BottomSheetModalProvider>
      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        onChange={setSheetIndex}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableOverDrag={false}
        // Content panning off: gorhom otherwise locks list scroll until full snap.
        enableContentPanningGesture={policy.enableContentPanningGesture}
        enableHandlePanningGesture={policy.enableHandlePanningGesture}
        activeOffsetY={[-8, 8]}
        handleComponent={renderHandle}
        containerStyle={styles.sheetContainer}
        bottomInset={bottomInset}
        backgroundStyle={{
          backgroundColor: surface,
          borderTopColor: border,
          borderTopWidth: StyleSheet.hairlineWidth,
        }}
        handleIndicatorStyle={{ backgroundColor: muted }}
        handleStyle={styles.handle}
        style={styles.sheet}>
        {detailQuery.isLoading || detailQuery.isPending ? (
          <View style={styles.loading}>
            <ActivityIndicator color={tint} />
            <Text style={{ color: muted }}>{t('planTripsLoading')}</Text>
          </View>
        ) : detailQuery.isError || !trip ? (
          <View style={styles.loading}>
            <Text style={{ color: text }}>{t('planTripsLoadFailed')}</Text>
          </View>
        ) : (
          <PlanVisibleListFrame
            containerHeight={sheetContainerHeight}
            handleHeight={handleHeight}>
            {chipsHeader ? <View style={styles.chipsSlot}>{chipsHeader}</View> : null}
            <View style={styles.listSlot} collapsable={false}>
              {listHost === 'sheet-scroll' ? (
                <BottomSheetFlatList
                  style={styles.list}
                  data={itineraryData}
                  extraData={resolvedSelection}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  keyExtractor={(item) => item.id}
                  ListHeaderComponent={overviewHeader}
                  ListEmptyComponent={
                    isOverview ? null : (
                      <Text style={[styles.empty, { color: muted }]}>—</Text>
                    )
                  }
                  renderItem={({ item, index }) => renderStop(item, index)}
                />
              ) : (
                <DraggableFlatList
                  data={itineraryData}
                  extraData={resolvedSelection}
                  keyExtractor={(item) => item.id}
                  onDragBegin={() => setDragging(true)}
                  onDragEnd={onDragEnd}
                  onRelease={endDrag}
                  activationDistance={isOverview ? 10_000 : 8}
                  containerStyle={styles.list}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={overviewHeader}
                  ListEmptyComponent={
                    isOverview ? null : (
                      <Text style={[styles.empty, { color: muted }]}>—</Text>
                    )
                  }
                  renderItem={renderItem}
                />
              )}
            </View>
          </PlanVisibleListFrame>
        )}
      </BottomSheet>

      {trip ? (
        <>
          <PlanStopDetailSheet
            visible={detailStopId != null && detailStop != null}
            tripId={tripId}
            trip={trip}
            stop={detailStop}
            prevStop={detailPrevStop}
            onClose={() => setDetailStopId(null)}
          />

          <PlanConflictActions
            visible={conflictTarget != null && conflictStop != null}
            tripId={tripId}
            stop={conflictStop}
            conflict={conflictTarget?.conflict ?? null}
            onClose={() => setConflictTarget(null)}
          />
        </>
      ) : null}
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    pointerEvents: 'box-none',
  },
  sheet: {
    zIndex: 30,
    elevation: 30,
  },
  handle: {
    paddingVertical: 10,
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
  listFrame: {
    overflow: 'hidden',
  },
  chipsSlot: {
    flexGrow: 0,
    flexShrink: 0,
  },
  listSlot: {
    flex: 1,
    minHeight: 0,
  },
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
  swipeDelete: {
    width: 88,
    marginRight: 12,
    marginVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeDeleteText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
