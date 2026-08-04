import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { FeaturedLocationDto } from '@/src/types/template-cook';

type SwapSheetProps = {
  visible: boolean;
  loading: boolean;
  candidates: FeaturedLocationDto[];
  customName: string;
  onChangeCustomName: (v: string) => void;
  onSelect: (locationId: string) => void;
  onCustom: () => void;
  onClose: () => void;
  submitting?: boolean;
};

export function SwapSheet({
  visible,
  loading,
  candidates,
  customName,
  onChangeCustomName,
  onSelect,
  onCustom,
  onClose,
  submitting,
}: SwapSheetProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: card }]}>
          <ThemedText type="subtitle">Đổi điểm</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }}>Chọn điểm curated cùng loại</ThemedText>

          {loading ? (
            <ActivityIndicator color={tint} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={candidates}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ gap: 8 }}
              ListEmptyComponent={
                <ThemedText style={{ color: muted, textAlign: 'center', marginVertical: 16 }}>
                  Hết ứng viên curated — nhập custom hoặc bỏ qua
                </ThemedText>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { borderColor: border }]}
                  onPress={() => onSelect(item.id)}
                  disabled={submitting}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
                    {item.address ?? item.slotType ?? ''}
                    {'distanceKm' in item && typeof (item as { distanceKm?: number }).distanceKm === 'number'
                      ? ` · ${(item as { distanceKm: number }).distanceKm} km`
                      : ''}
                  </ThemedText>
                </Pressable>
              )}
            />
          )}

          <TextInput
            value={customName}
            onChangeText={onChangeCustomName}
            placeholder="Tên điểm custom"
            placeholderTextColor={muted}
            style={[styles.input, { borderColor: border, color: text }]}
          />

          <View style={styles.actions}>
            <PressableScale style={[styles.btn, { borderColor: border, flex: 1 }]} onPress={onClose}>
              <ThemedText style={{ fontWeight: '600' }}>Bỏ qua</ThemedText>
            </PressableScale>
            <PressableScale
              style={[styles.btn, { backgroundColor: cta, borderColor: cta, flex: 1 }]}
              onPress={onCustom}
              disabled={submitting || !customName.trim()}>
              <ThemedText style={{ color: onCta, fontWeight: '700' }}>Dùng custom</ThemedText>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
