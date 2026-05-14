import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { CAPTURE_FRAME_PRESETS, type CaptureFramePresetId } from './captureFramePresets';
import { FrameOverlay } from '@/src/components/capture/FrameOverlay';

type Props = {
  selectedId: CaptureFramePresetId;
  onSelect: (id: CaptureFramePresetId) => void;
};

function MiniPreview({ preset, active }: { preset: CaptureFramePresetId; active: boolean }) {
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={[styles.miniBox, { borderColor: active ? tint : border }]}>
      <View style={styles.miniInner}>
        <FrameOverlay preset={preset} />
      </View>
    </View>
  );
}

export function FramePresetStrip({ selectedId, onSelect }: Props) {
  const { t } = useI18n();
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <FlatList
      horizontal
      data={CAPTURE_FRAME_PRESETS}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            onPress={() => onSelect(item.id)}
            style={[styles.chip, { backgroundColor: card }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(item.labelKey)}>
            <MiniPreview preset={item.id} active={active} />
            <ThemedText numberOfLines={1} style={[styles.chipLabel, { color: muted }]}>
              {t(item.labelKey)}
            </ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
  chip: {
    width: 76,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  miniBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  miniInner: { flex: 1, position: 'relative' },
});
