import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { PlannerStop, RouteLegSummary } from '@/src/types/trip-planner';

type TripRouteTimelineProps = {
  stops: PlannerStop[];
  legSummaries?: RouteLegSummary[];
  selectedClientId?: string | null;
  onSelectStop: (clientId: string) => void;
  onRemoveStop: (clientId: string) => void;
  onMoveUp: (clientId: string) => void;
  onMoveDown: (clientId: string) => void;
};

export function TripRouteTimeline({
  stops,
  legSummaries = [],
  selectedClientId,
  onSelectStop,
  onRemoveStop,
  onMoveUp,
  onMoveDown,
}: TripRouteTimelineProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  if (stops.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: border, backgroundColor: `${card}F5` }]}>
        <ThemedText style={{ color: muted, fontSize: 13 }}>{t('tripAnchorEmpty')}</ThemedText>
      </View>
    );
  }

  const legByTo = new Map(legSummaries.map((l) => [l.toClientId, l]));

  return (
    <FlatList
      horizontal
      data={stops}
      keyExtractor={(item) => item.clientId}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => {
        const selected = selectedClientId === item.clientId;
        const leg = legByTo.get(item.clientId);
        const isStart = item.role === 'start';

        return (
          <View style={styles.nodeWrap}>
            {index > 0 ? (
              <View style={styles.connector}>
                {leg &&
                Number.isFinite(leg.distanceKm) &&
                Number.isFinite(leg.durationMin) ? (
                  <ThemedText style={[styles.legText, { color: muted }]} numberOfLines={1}>
                    {leg.distanceKm.toFixed(1)} km · {Math.round(leg.durationMin)}p
                  </ThemedText>
                ) : (
                  <View style={[styles.legLine, { backgroundColor: border }]} />
                )}
              </View>
            ) : null}
            <PressableScale
              style={[
                styles.node,
                {
                  borderColor: selected ? tint : border,
                  backgroundColor: selected ? `${tint}12` : card,
                },
              ]}
              onPress={() => onSelectStop(item.clientId)}>
              <View style={[styles.numBadge, { backgroundColor: isStart ? tint : `${muted}33` }]}>
                <ThemedText style={{ color: isStart ? '#fff' : muted, fontSize: 11, fontWeight: '800' }}>
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.nodeName}>
                {isStart ? t('tripAnchorSet') : item.name}
              </ThemedText>
              {selected && !isStart ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => onRemoveStop(item.clientId)}
                  style={[styles.deleteChip, { borderColor: border }]}>
                  <ThemedText style={{ color: '#c0392b', fontSize: 10, fontWeight: '700' }}>
                    {t('tripRemoveRoute')}
                  </ThemedText>
                </Pressable>
              ) : null}
              {!isStart ? (
                <View style={styles.reorderRow}>
                  <Pressable hitSlop={8} onPress={() => onMoveUp(item.clientId)} disabled={index <= 1}>
                    <ThemedText style={{ color: index <= 1 ? `${muted}55` : muted, fontWeight: '700' }}>↑</ThemedText>
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => onMoveDown(item.clientId)} disabled={index >= stops.length - 1}>
                    <ThemedText
                      style={{
                        color: index >= stops.length - 1 ? `${muted}55` : muted,
                        fontWeight: '700',
                      }}>
                      ↓
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </PressableScale>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    marginHorizontal: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  list: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  nodeWrap: { flexDirection: 'row', alignItems: 'center' },
  connector: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  legLine: { height: 2, width: '100%', borderRadius: 1 },
  legText: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  node: {
    width: 108,
    minHeight: 88,
    borderWidth: 2,
    borderRadius: 14,
    padding: 8,
    gap: 4,
  },
  numBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nodeName: { fontSize: 12, lineHeight: 16 },
  reorderRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  deleteChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
});
