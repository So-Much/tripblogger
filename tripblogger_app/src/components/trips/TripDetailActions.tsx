import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripStatus } from '@/src/types/trip';

type TripDetailActionsProps = {
  status: TripStatus;
  totalStops: number;
  showRecommendations: boolean;
  isStarting: boolean;
  isRefreshingRecs: boolean;
  onStart: () => void;
  onNavigateNext: () => void;
  onComplete: () => void;
  onToggleRecommendations: () => void;
  onRefreshRecommendations: () => void;
};

export function TripDetailActions({
  status,
  totalStops,
  showRecommendations,
  isStarting,
  isRefreshingRecs,
  onStart,
  onNavigateNext,
  onComplete,
  onToggleRecommendations,
  onRefreshRecommendations,
}: TripDetailActionsProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const muted = useThemeColor({}, 'textMuted');

  const canStart = status === 'PLANNING' || status === 'DRAFT';
  const isActive = status === 'ACTIVE';

  return (
    <View style={styles.wrap}>
      {canStart ? (
        <PressableScale
          style={[styles.primaryBtn, { backgroundColor: cta }]}
          onPress={onStart}
          disabled={isStarting}>
          {isStarting ? (
            <ActivityIndicator color={onCta} />
          ) : (
            <>
              <IconSymbol name="location.fill" size={20} color={onCta} />
              <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                Bắt đầu chuyến đi
              </ThemedText>
            </>
          )}
        </PressableScale>
      ) : null}

      <View style={styles.secondaryRow}>
        {isActive && totalStops > 0 ? (
          <PressableScale
            style={[styles.secondaryBtn, { borderColor: border, backgroundColor: card }]}
            onPress={onNavigateNext}>
            <IconSymbol name="mappin.circle.fill" size={18} color={tint} />
            <ThemedText style={styles.secondaryLabel} numberOfLines={1}>
              Chỉ đường tiếp theo
            </ThemedText>
          </PressableScale>
        ) : null}

        {isActive ? (
          <PressableScale
            style={[styles.secondaryBtn, { borderColor: border, backgroundColor: card }]}
            onPress={onComplete}>
            <IconSymbol name="checkmark.circle.fill" size={18} color={tint} />
            <ThemedText style={styles.secondaryLabel}>Kết thúc</ThemedText>
          </PressableScale>
        ) : null}

        <PressableScale
          style={[
            styles.secondaryBtn,
            showRecommendations ? { borderColor: tint, backgroundColor: `${tint}12` } : { borderColor: border, backgroundColor: card },
          ]}
          onPress={onToggleRecommendations}>
          <IconSymbol name="star.fill" size={18} color={showRecommendations ? tint : muted} />
          <ThemedText style={[styles.secondaryLabel, showRecommendations ? { color: tint } : undefined]}>
            Gợi ý
          </ThemedText>
        </PressableScale>
      </View>

      {showRecommendations ? (
        <PressableScale
          style={[styles.refreshLink, { borderColor: border }]}
          onPress={onRefreshRecommendations}
          disabled={isRefreshingRecs}>
          {isRefreshingRecs ? (
            <ActivityIndicator color={tint} size="small" />
          ) : (
            <ThemedText style={{ color: tint, fontWeight: '600', fontSize: 14 }}>
              Làm mới gợi ý địa điểm
            </ThemedText>
          )}
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 110,
  },
  secondaryLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  refreshLink: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
