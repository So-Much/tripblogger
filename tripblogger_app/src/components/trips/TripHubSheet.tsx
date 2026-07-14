import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanChipRow } from '@/src/components/trips/PlanChipRow';
import { PlanNodeList } from '@/src/components/trips/PlanNodeList';
import { PlanPanel } from '@/src/components/trips/PlanPanel';
import { TripProgressTimeline } from '@/src/components/trips/TripProgressTimeline';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripDto } from '@/src/types/trip';
import type { MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import type { RouteLegSummary } from '@/src/types/trip-planner';

export type TripHubSheetMode = 'collapsed' | 'compact' | 'expanded';

type TripHubSheetProps = {
  plans: TripDto[];
  selectedTripId: string | null;
  activePlan: TripDto | null;
  mode?: TripHubSheetMode;
  onModeChange?: (mode: TripHubSheetMode) => void;
  pinnedLocation: MapExplorePin | null;
  cityHighlights: MapExplorePin[];
  nearbyProvinceHighlights: MapExplorePin[];
  globalHighlights: MapExplorePin[];
  stops: MapRouteStop[];
  selectedStopId?: string | null;
  onSelectPlan: (tripId: string) => void;
  onCreatePlan: () => void;
  onSelectStop: (stop: MapRouteStop) => void;
  onRemoveStop: (stop: MapRouteStop) => void;
  onReorderStops: (stops: { id: string; orderIndex: number }[]) => void;
  legSummaries?: RouteLegSummary[];
  onRename: (title: string) => void;
  onChangeDates: (startDate: string, endDate: string) => void;
  onStatus: (status: TripDto['status']) => void;
  onAddRecommendation: (pin: MapExplorePin) => void;
};

export function TripHubSheet({
  plans,
  selectedTripId,
  activePlan,
  mode: controlledMode,
  onModeChange,
  pinnedLocation,
  cityHighlights,
  nearbyProvinceHighlights,
  globalHighlights,
  stops,
  selectedStopId,
  onSelectPlan,
  onCreatePlan,
  onSelectStop,
  onRemoveStop,
  onReorderStops,
  legSummaries = [],
  onRename,
  onChangeDates,
  onStatus,
  onAddRecommendation,
}: TripHubSheetProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const [internalMode, setInternalMode] = useState<TripHubSheetMode>('expanded');
  const mode = controlledMode ?? internalMode;
  const updateMode = (next: TripHubSheetMode | ((prev: TripHubSheetMode) => TripHubSheetMode)) => {
    const resolved = typeof next === 'function' ? next(mode) : next;
    if (onModeChange) onModeChange(resolved);
    else setInternalMode(resolved);
  };
  const maxHeight = useMemo(() => {
    if (mode === 'collapsed') return 76;
    if (mode === 'compact') return 260;
    return '68%';
  }, [mode]);

  return (
    <View style={[styles.sheet, { borderColor: border, backgroundColor: `${card}FA`, maxHeight }]}>
      <View style={styles.headerRow}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <View style={styles.headerActions}>
          <Pressable onPress={() => updateMode((m) => (m === 'collapsed' ? 'compact' : 'collapsed'))} style={styles.iconBtn}>
            <IconSymbol name={mode === 'collapsed' ? 'chevron.right' : 'chevron.left'} size={16} color={tint} />
          </Pressable>
          <Pressable
            onPress={() => updateMode((m) => (m === 'expanded' ? 'compact' : 'expanded'))}
            style={styles.iconBtn}>
            <IconSymbol name="plus.circle.fill" size={16} color={tint} />
          </Pressable>
        </View>
      </View>
      <ThemedText type="defaultSemiBold">{t('tripPlanTitle')}</ThemedText>
      {mode !== 'collapsed' ? (
        <>
          <PlanChipRow plans={plans} selectedTripId={selectedTripId} onSelect={onSelectPlan} onCreateNew={onCreatePlan} />
          <PlanNodeList
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={onSelectStop}
            onRemoveStop={onRemoveStop}
            onReorder={onReorderStops}
          />
          {legSummaries.length > 0 ? (
            <View style={styles.legSummaryRow}>
              {legSummaries.slice(0, 3).map((leg) => (
                <View key={`${leg.fromClientId}:${leg.toClientId}`} style={[styles.legChip, { borderColor: border }]}>
                  <ThemedText style={[styles.legChipText, { color: muted }]}>
                    {Math.round(leg.durationMin)}p · {leg.distanceKm.toFixed(1)}km
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
          {activePlan?.status === 'ACTIVE' ? <TripProgressTimeline stops={stops} /> : null}
          {mode === 'expanded' ? (
            <PlanPanel
              plan={activePlan}
              stopCount={stops.length}
              pinnedLocation={pinnedLocation}
              cityHighlights={cityHighlights}
              nearbyProvinceHighlights={nearbyProvinceHighlights}
              globalHighlights={globalHighlights}
              onAddRecommendation={onAddRecommendation}
              onRename={onRename}
              onChangeDates={onChangeDates}
              onStatus={onStatus}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    maxHeight: '56%',
    zIndex: 20,
    elevation: 8,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  legSummaryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  legChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  legChipText: { fontSize: 11, fontWeight: '600' },
});
