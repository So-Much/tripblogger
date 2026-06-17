import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanChipRow } from '@/src/components/trips/PlanChipRow';
import { PlanNodeList } from '@/src/components/trips/PlanNodeList';
import { PlanPanel } from '@/src/components/trips/PlanPanel';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripDto } from '@/src/types/trip';
import type { MapExplorePin, MapRouteStop } from '@/src/types/trip-map';

type TripHubSheetProps = {
  plans: TripDto[];
  selectedTripId: string | null;
  activePlan: TripDto | null;
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
  onMoveUp: (stop: MapRouteStop) => void;
  onMoveDown: (stop: MapRouteStop) => void;
  onRename: (title: string) => void;
  onChangeDates: (startDate: string, endDate: string) => void;
  onStatus: (status: TripDto['status']) => void;
  onAddRecommendation: (pin: MapExplorePin) => void;
};

export function TripHubSheet({
  plans,
  selectedTripId,
  activePlan,
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
  onMoveUp,
  onMoveDown,
  onRename,
  onChangeDates,
  onStatus,
  onAddRecommendation,
}: TripHubSheetProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const [mode, setMode] = useState<'collapsed' | 'compact' | 'expanded'>('expanded');
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
          <Pressable onPress={() => setMode((m) => (m === 'collapsed' ? 'compact' : 'collapsed'))} style={styles.iconBtn}>
            <IconSymbol name={mode === 'collapsed' ? 'chevron.up' : 'chevron.down'} size={16} color={tint} />
          </Pressable>
          <Pressable
            onPress={() => setMode((m) => (m === 'expanded' ? 'compact' : 'expanded'))}
            style={styles.iconBtn}>
            <IconSymbol name={mode === 'expanded' ? 'arrow.down.right.and.arrow.up.left' : 'arrow.up.left.and.arrow.down.right'} size={16} color={tint} />
          </Pressable>
        </View>
      </View>
      <ThemedText type="defaultSemiBold">Kế hoạch chuyến đi</ThemedText>
      {mode !== 'collapsed' ? (
        <>
          <PlanChipRow plans={plans} selectedTripId={selectedTripId} onSelect={onSelectPlan} onCreateNew={onCreatePlan} />
          <PlanNodeList
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={onSelectStop}
            onRemoveStop={onRemoveStop}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
          {mode === 'expanded' ? (
            <PlanPanel
              plan={activePlan}
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
});
