import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetHandle,
  useBottomSheet,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { PlanStopSettingsPanel } from './PlanStopDetailSheet';
import { PlanTravelConnector } from './PlanTravelConnector';
import { computeDepartNowDuration } from './plan-depart-now';
import { planDayColor } from './plan-day-color';
import { planStopDeleteTarget } from './plan-stop-delete';
import { clampBufferMinutes, travelMinutesToSeconds } from './plan-travel-minutes';
import {
  PLAN_HOST_SWAP_DEBOUNCE_MS,
  PLAN_SHEET_CLOSED_INDEX,
  PLAN_SHEET_FULL_INDEX,
  PLAN_SHEET_MID_INDEX,
  planSheetChromeLayout,
  planSheetGesturePolicy,
  planTimelineBodyKind,
  resolvePlanSheetHost,
  resolvePlanTimelineBody,
  samePlanSheetTab,
  wantedPlanSheetHost,
  type PlanSheetHostKind,
  type PlanTimelineBodyKind,
} from './plan-sheet-layout';

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
 * Long-press reorder at mid and full; swipe-to-delete only at peek.
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
  const wantedBody = planTimelineBodyKind({
    hasTrip: trip != null,
    isError: Boolean(detailQuery.isError && trip == null),
  });
  const [bodyKind, setBodyKind] = useState<PlanTimelineBodyKind>(wantedBody);
  useEffect(() => {
    setBodyKind((current) => resolvePlanTimelineBody({ current, wanted: wantedBody }));
  }, [wantedBody]);
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
  const pendingTripId = usePlanStore((s) => s.pendingTripId);
  const setSettingsSheetIndex = usePlanStore((s) => s.setSettingsSheetIndex);
  const sheetRef = useRef<BottomSheet>(null);
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
    if (pendingTripId) setDetailStopId(null);
  }, [pendingTripId]);

  useEffect(() => {
    return () => {
      setSettingsSheetIndex(PLAN_SHEET_CLOSED_INDEX);
    };
  }, [setSettingsSheetIndex]);

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
    if (detailStopId != null && detailStop == null) {
      setDetailStopId(null);
    }
  }, [detailStopId, detailStop]);

  useEffect(() => {
    if (!focusedStopId) return;
    if (allStops.some((s) => s.id === focusedStopId)) {
      setDetailStopId(focusedStopId);
      setSettingsSheetIndex(PLAN_SHEET_FULL_INDEX);
      sheetRef.current?.snapToIndex(PLAN_SHEET_FULL_INDEX);
    }
    setFocusedStopId(null);
  }, [allStops, focusedStopId, setFocusedStopId, setSettingsSheetIndex]);

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

  const sheetChrome = useMemo(
    () =>
      planSheetChromeLayout({
        windowHeight,
        sheetTopInset,
        safeBottom: insets.bottom,
      }),
    [windowHeight, sheetTopInset, insets.bottom],
  );
  const bottomInset = sheetChrome.bottomInset;
  const snapPoints = sheetChrome.snapPoints;
  const sheetContainerHeight = Math.max(0, windowHeight - bottomInset);
  const settingsOpen = detailStopId != null;
  const gesturesEnabled = planTabActive && !searchOverlay;
  const policy = planSheetGesturePolicy({
    sheetIndex,
    dragging,
    gesturesEnabled,
  });
  const canDrag = policy.canDragReorder && !settingsOpen;
  const wantedHost: PlanSheetHostKind = wantedPlanSheetHost({
    tabKind: resolvedSelection.kind,
    listKind: policy.listKind,
  });
  const [listHost, setListHost] = useState<PlanSheetHostKind>(wantedHost);

  useEffect(() => {
    if (dragging) {
      setListHost((current) =>
        resolvePlanSheetHost({
          wanted: wantedHost,
          current,
          dragging,
        }),
      );
      return;
    }
    const timer = setTimeout(() => {
      setListHost((current) =>
        resolvePlanSheetHost({
          wanted: wantedHost,
          current,
          dragging: false,
        }),
      );
    }, PLAN_HOST_SWAP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dragging, wantedHost]);

  const openStopSettings = useCallback(
    (stopId: string) => {
      setDetailStopId(stopId);
      setSettingsSheetIndex(PLAN_SHEET_FULL_INDEX);
      sheetRef.current?.snapToIndex(PLAN_SHEET_FULL_INDEX);
    },
    [setSettingsSheetIndex],
  );

  const closeStopSettings = useCallback(() => {
    setDetailStopId(null);
    setSettingsSheetIndex(PLAN_SHEET_CLOSED_INDEX);
  }, [setSettingsSheetIndex]);

  const confirmDeleteStop = useCallback(() => {
    if (!detailStop) return;
    const target = planStopDeleteTarget(detailStop);
    Alert.alert(t(target.titleKey), target.message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('planDeleteStop'),
        style: 'destructive',
        onPress: () => {
          deleteStop.mutate(
            { tripId, stopId: target.stopId },
            { onSuccess: () => closeStopSettings() },
          );
        },
      },
    ]);
  }, [closeStopSettings, deleteStop, detailStop, t, tripId]);

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
          onSettingsPress={() => openStopSettings(item.id)}
          onDeletePress={() => requestDelete(item)}
          onDepartPress={() =>
            applyStopPatch(item.id, {
              durationMinutes: computeDepartNowDuration(item, new Date(), 15),
            })
          }
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
              travelMode={item.travelModeOverride ?? item.travelModeUsed}
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
      openStopSettings,
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
            {settingsOpen && detailStop ? (
              <View style={styles.settingsHeaderRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('back')}
                  onPress={closeStopSettings}
                  hitSlop={8}
                  style={styles.headerIconBtn}>
                  <MaterialIcons name="arrow-back" size={22} color={text} />
                </Pressable>
                <Text style={[styles.title, styles.titleFlex, { color: text }]} numberOfLines={1}>
                  {detailStop.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planDeleteStop')}
                  onPress={confirmDeleteStop}
                  hitSlop={8}
                  style={styles.headerIconBtn}>
                  <MaterialIcons name="delete-outline" size={20} color={danger} />
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.title, { color: text }]} numberOfLines={1}>
                {tripTitle.trim() || t('mapTabPlan')}
              </Text>
            )}
            <Text style={[styles.sub, { color: muted }]}>
              {settingsOpen
                ? t('planStopEditorHint')
                : isOverview
                  ? t('planOverviewHint')
                  : canDrag
                    ? t('planPrototypeHintFull')
                    : t('planPrototypeHintPeek')}
            </Text>
          </View>
        </BottomSheetHandle>
      </View>
    ),
    [
      canDrag,
      closeStopSettings,
      confirmDeleteStop,
      danger,
      detailStop,
      isOverview,
      muted,
      onHandleLayout,
      settingsOpen,
      t,
      text,
      tripTitle,
    ],
  );

  const chipsHeader =
    trip != null ? (
      <PlanDayChips
        days={days}
        selection={resolvedSelection}
        onSelect={(next) => {
          if (samePlanSheetTab(resolvedSelection, next)) return;
          closeStopSettings();
          setOptimisticStops(null);
          setSelection(next);
        }}
        ideaCount={trip.ideaStops.length}
      />
    ) : null;

  const selectOverviewDay = (dayId: string) => {
    if (samePlanSheetTab(resolvedSelection, { kind: 'day', dayId })) return;
    closeStopSettings();
    setOptimisticStops(null);
    setSelection({ kind: 'day', dayId });
  };

  const overviewHeader = isOverview ? (
    <PlanOverview days={days} onSelectDay={selectOverviewDay} />
  ) : null;

  const itineraryData = isOverview ? [] : stops;

  return (
    <View style={styles.sheetStack} pointerEvents="box-none">
      <BottomSheet
        ref={sheetRef}
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
        keyboardBehavior={settingsOpen ? 'extend' : 'interactive'}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
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
        {bodyKind === 'error' ? (
          <View style={styles.loading}>
            <Text style={{ color: text }}>{t('planTripsLoadFailed')}</Text>
          </View>
        ) : bodyKind === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={tint} />
            <Text style={{ color: muted }}>{t('planTripsLoading')}</Text>
          </View>
        ) : settingsOpen && detailStop ? (
          <PlanVisibleListFrame
            containerHeight={sheetContainerHeight}
            handleHeight={handleHeight}>
            <PlanStopSettingsPanel
              tripId={tripId}
              trip={trip ?? null}
              stop={detailStop}
              prevStop={detailPrevStop}
              onClose={closeStopSettings}
            />
          </PlanVisibleListFrame>
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
                  extraData={{ selection: resolvedSelection, canDrag, tripId }}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  keyExtractor={(item: { id: string }) => item.id}
                  ListHeaderComponent={overviewHeader}
                  ListEmptyComponent={
                    isOverview ? null : (
                      <Text style={[styles.empty, { color: muted }]}>—</Text>
                    )
                  }
                  renderItem={({
                    item,
                    index,
                  }: {
                    item: (typeof itineraryData)[number];
                    index: number;
                  }) => renderStop(item, index)}
                />
              ) : (
                <DraggableFlatList
                  data={itineraryData}
                  extraData={{ selection: resolvedSelection, canDrag, tripId }}
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
              {bodyKind === 'list' && (trip == null || trip.id !== tripId) ? (
                <View style={styles.listOverlay} pointerEvents="auto">
                  <ActivityIndicator color={tint} />
                </View>
              ) : null}
            </View>
          </PlanVisibleListFrame>
        )}
      </BottomSheet>

      {trip ? (
        <PlanConflictActions
          visible={conflictTarget != null && conflictStop != null}
          tripId={tripId}
          stop={conflictStop}
          conflict={conflictTarget?.conflict ?? null}
          onClose={() => setConflictTarget(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetStack: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'box-none',
  },
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
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleFlex: {
    flex: 1,
    paddingHorizontal: 0,
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
  listOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
