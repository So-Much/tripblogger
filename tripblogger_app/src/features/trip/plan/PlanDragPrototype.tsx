import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { PLAN_NAV_BAR_OFFSET } from './plan-sheet-layout';

type ProtoStop = { id: string; title: string };

/** Fake stops — Task 11 gesture prototype only; replaced by real trip data later. */
const INITIAL_STOPS: ProtoStop[] = [
  { id: '1', title: 'Ga Đà Lạt' },
  { id: '2', title: 'Hồ Xuân Hương' },
  { id: '3', title: 'Chợ Đà Lạt' },
  { id: '4', title: 'Đồi chè Cầu Đất' },
  { id: '5', title: 'Thác Datanla' },
];

const FULL_INDEX = 2;
const SNAP_POINTS = ['18%', '50%', '92%'] as const;

type Props = {
  /** Active trip title when wired from PlanTab; falls back to mapTabPlan. */
  tripTitle?: string;
};

/**
 * Early gesture prototype (rủi ro #1): drag list only when sheet is full;
 * lock sheet pan while a row is being dragged.
 */
export function PlanDragPrototype({ tripTitle }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');

  const [data, setData] = useState(INITIAL_STOPS);
  const [sheetIndex, setSheetIndex] = useState(1);
  const [dragging, setDragging] = useState(false);

  const snapPoints = useMemo(() => [...SNAP_POINTS], []);
  const canDrag = sheetIndex === FULL_INDEX;
  // Full snap: list owns gestures. Mid/peek: sheet can pan via content.
  // While dragging a row: lock both content and handle pan.
  const enableContentPanning = sheetIndex !== FULL_INDEX && !dragging;
  const enableHandlePanning = !dragging;
  const bottomInset = Math.max(insets.bottom, 8) + PLAN_NAV_BAR_OFFSET;

  const endDrag = useCallback(() => setDragging(false), []);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ProtoStop>) => (
      <ScaleDecorator>
        <Pressable
          onLongPress={canDrag ? drag : undefined}
          delayLongPress={180}
          disabled={isActive}
          style={[
            styles.row,
            {
              backgroundColor: surface,
              borderBottomColor: border,
              opacity: isActive ? 0.92 : 1,
            },
          ]}>
          <MaterialIcons
            name="drag-indicator"
            size={22}
            color={canDrag ? muted : border}
          />
          <Text style={[styles.rowTitle, { color: text }]} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      </ScaleDecorator>
    ),
    [border, canDrag, muted, surface, text],
  );

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
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]} numberOfLines={1}>
          {tripTitle?.trim() || t('mapTabPlan')}
        </Text>
        <Text style={[styles.sub, { color: muted }]}>
          {canDrag ? t('planPrototypeHintFull') : t('planPrototypeHintPeek')}
        </Text>
      </View>
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.id}
        onDragBegin={() => setDragging(true)}
        onDragEnd={({ data: next }) => {
          setDragging(false);
          setData(next);
        }}
        onRelease={endDrag}
        activationDistance={canDrag ? 8 : 10_000}
        containerStyle={styles.list}
        contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 2,
  },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13 },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
});
