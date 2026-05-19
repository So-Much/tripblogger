import { Pressable, StyleSheet, View } from 'react-native';
import type { FlashMode } from 'expo-camera';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';

type Props = {
  flash: FlashMode;
  onFlashCycle: () => void;
  torch: boolean;
  onTorchToggle: () => void;
  disabled?: boolean;
};

function flashIconName(flash: FlashMode): IconSymbolName {
  if (flash === 'off') return 'bolt.slash.fill';
  if (flash === 'on') return 'bolt.fill';
  return 'bolt.badge.automatic';
}

const ICON = '#F2F2F7';
const ICON_DIM = 'rgba(242,242,247,0.55)';
const PILL_BG = 'rgba(22,22,24,0.94)';

/** Compact flash + torch controls for take-media top bar. */
export function CaptureFlashTorchBar({ flash, onFlashCycle, torch, onTorchToggle, disabled }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.pill}>
      <Pressable
        disabled={disabled}
        onPress={onFlashCycle}
        style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('captureFlash')}
        hitSlop={10}>
        <IconSymbol name={flashIconName(flash)} size={20} color={flash === 'off' ? ICON_DIM : ICON} />
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        disabled={disabled}
        onPress={onTorchToggle}
        style={({ pressed }) => [styles.hit, pressed && styles.hitPressed, torch && styles.hitTorch]}
        accessibilityRole="button"
        accessibilityState={{ selected: torch }}
        accessibilityLabel={t('captureTorch')}
        hitSlop={10}>
        <IconSymbol name="flashlight.on.fill" size={20} color={torch ? ICON : ICON_DIM} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 22,
    backgroundColor: PILL_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  hit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  hitTorch: {
    backgroundColor: 'rgba(255,200,80,0.22)',
  },
});
