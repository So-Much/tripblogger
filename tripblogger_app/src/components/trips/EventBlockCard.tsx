import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { EventBlockDto } from '@/src/types/template-cook';
import { eventBlockName, slotTypeLabel } from '@/src/utils/template-cook';

type EventBlockCardProps = {
  block: EventBlockDto;
  showLiveActions?: boolean;
  onCheckIn?: () => void;
  onSwap?: () => void;
};

export function EventBlockCard({ block, showLiveActions, onCheckIn, onSwap }: EventBlockCardProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const done = block.status === 'DONE';

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: border,
          backgroundColor: card,
          opacity: done ? 0.45 : 1,
        },
      ]}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="defaultSemiBold" numberOfLines={2}>
            {eventBlockName(block)}
          </ThemedText>
          <ThemedText style={{ color: muted, fontSize: 12 }}>
            {slotTypeLabel(block.slotType)} · {block.status}
            {block.plannedDurationMin ? ` · ${block.plannedDurationMin} phút` : ''}
          </ThemedText>
        </View>
      </View>
      {showLiveActions && block.status === 'PLANNED' ? (
        <View style={styles.actions}>
          <PressableScale style={[styles.btn, { borderColor: tint, backgroundColor: `${tint}14` }]} onPress={onCheckIn}>
            <ThemedText style={{ color: tint, fontWeight: '700', fontSize: 13 }}>Check-in</ThemedText>
          </PressableScale>
          <PressableScale style={[styles.btn, { borderColor: border }]} onPress={onSwap}>
            <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Đổi điểm</ThemedText>
          </PressableScale>
        </View>
      ) : null}
      {done ? (
        <ThemedText style={{ color: muted, fontSize: 12, fontWeight: '600' }}>Đã check-in</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
