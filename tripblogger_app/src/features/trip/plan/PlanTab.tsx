import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/store/auth.store';
import { useTrips } from '../hooks/useTrips';
import { useTripDetail } from '../hooks/useTripDetail';
import { usePlanStore } from '../store/plan.store';
import type { TripDetailDto, TripSummaryDto } from '../types/plan';
import { formatDateRangeDisplay } from './plan-create-dates';
import { DEFAULT_CURRENCY, formatCurrency } from '@/src/utils/format-currency';
import {
  PLAN_SHEET_SNAP_DEBOUNCE_MS,
  consumePendingTripAfterDismiss,
} from './plan-sheet-layout';
import { PlanBudgetBar } from './PlanBudgetBar';
import { PlanEmptyCreate } from './PlanEmptyCreate';
import { PlanGuestGate } from './PlanGuestGate';
import { PlanTimeline } from './PlanTimeline';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PICKER_LAYOUT_ANIM = {
  duration: 240,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};
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
  const requestActiveTripId = usePlanStore((s) => s.requestActiveTripId);
  const pendingTripId = usePlanStore((s) => s.pendingTripId);
  const settingsSheetIndex = usePlanStore((s) => s.settingsSheetIndex);
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

  useEffect(() => {
    const next = consumePendingTripAfterDismiss({
      pendingTripId,
      settingsSheetIndex,
    });
    if (!next || next === activeTripId) return;
    const timer = setTimeout(() => {
      setActiveTripId(next);
    }, PLAN_SHEET_SNAP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pendingTripId, settingsSheetIndex, activeTripId, setActiveTripId]);

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

  const active = tripList.find((tr) => tr.id === activeTripId) ?? tripList[0];
  const pickerTop = insets.top + HEADER_CLEARANCE;
  const sheetTopInset = pickerTop + pickerHeight + PICKER_SHEET_GAP;

  return (
    <View style={styles.memberRoot} pointerEvents="box-none">
      {creating ? (
        <PlanEmptyCreate onCreated={onCreated} onCancel={() => setCreating(false)} />
      ) : (
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
            activeTrip={active}
            onSelect={requestActiveTripId}
            onCreate={() => setCreating(true)}
          />
        </View>
      )}

      <View
        style={[styles.timelineSlot, creating ? styles.timelineHidden : null]}
        pointerEvents={creating ? 'none' : 'box-none'}>
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
  activeTrip,
  onSelect,
  onCreate,
}: {
  trips: TripSummaryDto[];
  activeTripId: string;
  activeTrip: TripSummaryDto;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const { t, language } = useI18n();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const [expanded, setExpanded] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chevronDeg = useSharedValue(0);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(PICKER_LAYOUT_ANIM);
    setExpanded((v) => {
      const next = !v;
      chevronDeg.value = withTiming(next ? 0 : 180, { duration: 220 });
      return next;
    });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronDeg.value}deg` }],
  }));

  const activeTrip_ = trips.find((tr) => tr.id === activeTripId);
  const detailQuery = useTripDetail(activeTripId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter(
      (tr) =>
        tr.title.toLowerCase().includes(q) ||
        tr.destinationLabel.toLowerCase().includes(q),
    );
  }, [query, trips]);

  return (
    <View style={[styles.pickerPanel, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.pickerHeader}>
        <Pressable
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('planPickerCollapse') : t('planPickerExpand')}
          style={styles.pickerHeaderLeft}>
          <Animated.View style={chevronStyle}>
            <MaterialIcons name="expand-less" size={18} color={muted} />
          </Animated.View>
          {!expanded && activeTrip_ ? (
            <Text style={[styles.pickerCollapsedTitle, { color: text }]} numberOfLines={1}>
              {activeTrip_.title}
            </Text>
          ) : (
            <Text style={[styles.pickerLabel, { color: muted }]}>{t('planPickTrip')}</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planPickerAllTrips')}
          onPress={() => {
            setQuery('');
            setListOpen(true);
          }}
          hitSlop={8}
          style={[styles.listBtn, { borderColor: border }]}>
          <MaterialIcons name="format-list-bulleted" size={18} color={muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planCreateNewTrip')}
          onPress={onCreate}
          hitSlop={8}
          style={[styles.addBtn, { borderColor: tint }]}>
          <MaterialIcons name="add" size={20} color={tint} />
        </Pressable>
      </View>

      {expanded ? (
        <View>
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
                  {trip.budgetAmount != null && trip.budgetAmount > 0 ? (
                    <Text
                      numberOfLines={1}
                      style={{ color: active ? tint : muted, fontSize: 10, fontWeight: '600' }}>
                      {formatCurrency(trip.budgetAmount, {
                        language,
                        currency: trip.budgetCurrency ?? DEFAULT_CURRENCY,
                      })}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <PlanBudgetBar
            trips={trips}
            activeTrip={activeTrip}
            tripDetail={detailQuery.data ?? null}
          />
        </View>
      ) : null}

      <Modal visible={listOpen} animationType="slide" onRequestClose={() => setListOpen(false)}>
        <View style={[styles.listModal, { backgroundColor: background }]}>
          <View style={[styles.listModalHeader, { borderBottomColor: border }]}>
            <Text style={[styles.listModalTitle, { color: text }]}>{t('planPickerAllTrips')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              onPress={() => setListOpen(false)}
              hitSlop={8}
              style={styles.listCloseBtn}>
              <MaterialIcons name="close" size={22} color={muted} />
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('planPickerSearch')}
            placeholderTextColor={muted}
            style={[styles.searchInput, { color: text, borderColor: border, backgroundColor: surface }]}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={{ color: muted, textAlign: 'center', marginTop: 24 }}>
                {t('planPickerSearchEmpty')}
              </Text>
            }
            renderItem={({ item }) => {
              const active = item.id === activeTripId;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    setListOpen(false);
                    setExpanded(false);
                  }}
                  style={[
                    styles.listRow,
                    {
                      borderColor: active ? tint : border,
                      backgroundColor: active ? `${tint}12` : surface,
                    },
                  ]}>
                  <View style={styles.listRowBody}>
                    <Text style={{ color: active ? tint : text, fontWeight: '700', fontSize: 15 }}>
                      {item.title}
                    </Text>
                    <Text style={{ color: muted, fontSize: 12 }}>{item.destinationLabel}</Text>
                    <Text style={{ color: muted, fontSize: 12 }}>
                      {formatDateRangeDisplay(item.startDate, item.endDate, locale)}
                    </Text>
                  </View>
                  {item.budgetAmount != null && item.budgetAmount > 0 ? (
                    <Text style={{ color: active ? tint : muted, fontWeight: '700', fontSize: 12 }}>
                      {formatCurrency(item.budgetAmount, {
                        language,
                        currency: item.budgetCurrency ?? DEFAULT_CURRENCY,
                      })}
                    </Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  memberRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  loading: {
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  timelineHidden: {
    opacity: 0,
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
  pickerHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerLabel: { fontSize: 11, fontWeight: '600' },
  pickerCollapsedTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  listBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  listModal: {
    flex: 1,
    paddingTop: 48,
  },
  listModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  listCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listRowBody: {
    flex: 1,
    gap: 2,
  },
});
