import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapExplorePin } from '@/src/types/trip-map';

type TripPinActionSheetProps = {
  visible: boolean;
  pin: MapExplorePin | null;
  tripTitle?: string | null;
  adding?: boolean;
  onClose: () => void;
  onAddToTrip: () => void;
  onDirections: () => void;
};

export function TripPinActionSheet({
  visible,
  pin,
  tripTitle,
  adding = false,
  onClose,
  onAddToTrip,
  onDirections,
}: TripPinActionSheetProps) {
  const insets = useSafeAreaInsets();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  if (!pin) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: card,
            borderColor: border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <LocationNameLabel
          name={pin.name}
          locationType={pin.locationType}
          variant="dense"
          subtitle={
            pin.distanceKm != null
              ? `${pin.distanceKm.toFixed(1)} km${pin.avgRating > 0 ? ` · ★${pin.avgRating.toFixed(1)}` : ''}`
              : null
          }
        />
        {pin.address ? (
          <ThemedText style={{ color: muted, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
            {pin.address}
          </ThemedText>
        ) : null}
        {pin.distanceKm != null ? (
          <ThemedText style={{ color: muted, fontSize: 12, marginTop: 4 }}>
            Cách checkpoint {pin.distanceKm.toFixed(1)} km
            {pin.avgRating > 0 ? ` · ★ ${pin.avgRating.toFixed(1)}` : ''}
          </ThemedText>
        ) : null}

        <PressableScale
          style={[styles.action, { borderColor: border, backgroundColor: `${tint}12` }]}
          onPress={onDirections}>
          <IconSymbol name="location.fill" size={20} color={tint} />
          <View style={styles.actionText}>
            <ThemedText type="defaultSemiBold">Bắt đầu chỉ đường</ThemedText>
            <ThemedText style={{ color: muted, fontSize: 12 }}>Từ vị trí của bạn tới điểm đích</ThemedText>
          </View>
        </PressableScale>

        <PressableScale
          style={[styles.action, styles.primaryAction, { backgroundColor: cta, opacity: adding ? 0.7 : 1 }]}
          onPress={onAddToTrip}
          disabled={adding}>
          <IconSymbol name="plus.circle.fill" size={20} color={onCta} />
          <View style={styles.actionText}>
            <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
              {adding ? 'Đang thêm…' : 'Thêm vào chuyến đi'}
            </ThemedText>
            <ThemedText style={{ color: onCta, fontSize: 12, opacity: 0.85 }}>
              {tripTitle ? `Thêm vào "${tripTitle}"` : 'Tạo hoặc chọn chuyến đi'}
            </ThemedText>
          </View>
        </PressableScale>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    opacity: 0.35,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  primaryAction: {
    borderWidth: 0,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
});
