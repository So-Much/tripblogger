import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { FrameOverlay } from '@/src/components/capture/FrameOverlay';
import { CAPTURE_FRAME_PRESETS, type CaptureFramePresetId } from './captureFramePresets';

type Props = {
  selectedId: CaptureFramePresetId;
  onSelect: (id: CaptureFramePresetId) => void;
};

function MiniPreview({ preset, active }: { preset: CaptureFramePresetId; active: boolean }) {
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={[styles.miniBox, { borderColor: active ? tint : 'rgba(255,255,255,0.45)' }]}>
      <View style={styles.miniInner}>
        <FrameOverlay preset={preset} />
      </View>
    </View>
  );
}

export function FramePresetStrip({ selectedId, onSelect }: Props) {
  const { t } = useI18n();
  const card = useThemeColor({}, 'card');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled">
      {CAPTURE_FRAME_PRESETS.map((item) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.chip, { backgroundColor: card }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(item.labelKey)}>
            <MiniPreview preset={item.id} active={active} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    width: 56,
    height: 56,
    borderRadius: 14,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  miniInner: { flex: 1, position: 'relative' },
});
