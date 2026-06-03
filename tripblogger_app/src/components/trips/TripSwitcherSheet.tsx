import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripDto } from '@/src/types/trip';

type TripSummary = { trip: TripDto; total: number; visited: number };

type TripSwitcherSheetProps = {
  visible: boolean;
  summaries: TripSummary[];
  selectedTripId: string | null;
  onClose: () => void;
  onSelect: (tripId: string) => void;
};

export function TripSwitcherSheet({
  visible,
  summaries,
  selectedTripId,
  onClose,
  onSelect,
}: TripSwitcherSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: card, borderColor: border, paddingBottom: Math.max(insets.bottom, 16) },
        ]}>
        <ThemedText type="subtitle">{t('tripSwitcherTitle')}</ThemedText>
        <ScrollView style={{ maxHeight: 320 }}>
          {summaries.map(({ trip, total, visited }) => {
            const active = trip.id === selectedTripId;
            return (
              <PressableScale
                key={trip.id}
                style={[
                  styles.row,
                  { borderColor: active ? tint : border, backgroundColor: active ? `${tint}10` : 'transparent' },
                ]}
                onPress={() => {
                  onSelect(trip.id);
                  onClose();
                }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {trip.title}
                  </ThemedText>
                  <ThemedText style={{ color: muted, fontSize: 12 }}>
                    {trip.status} · {t('tripSwitcherProgress', { visited, total })}
                  </ThemedText>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
});
