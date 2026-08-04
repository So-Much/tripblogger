import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { postsService } from '@/src/services/api/posts.service';
import { tripsService } from '@/src/services/api/trips.service';
import { formatApiError } from '@/src/utils/format-api-error';

type CheckInSheetProps = {
  visible: boolean;
  tripId: string;
  eventBlockId: string;
  placeName: string;
  onClose: () => void;
  onDone: () => void;
};

export function CheckInSheet({
  visible,
  tripId,
  eventBlockId,
  placeName,
  onClose,
  onDone,
}: CheckInSheetProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const text = useThemeColor({}, 'text');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const tint = useThemeColor({}, 'tint');

  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền ảnh', 'Cho phép truy cập thư viện để đính kèm ảnh check-in.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setImageUri(res.assets[0].uri);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const locPerm = await Location.requestForegroundPermissionsAsync();
        if (locPerm.granted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }
      } catch {
        // GPS optional
      }

      const checkIn = await tripsService.createCheckIn(tripId, {
        eventBlockId,
        note: note.trim() || undefined,
        latitude,
        longitude,
      });

      if (imageUri) {
        try {
          const uploaded = await postsService.uploadMedia(
            {
              uri: imageUri,
              name: `checkin-${Date.now()}.jpg`,
              type: 'image/jpeg',
            },
            'image',
          );
          if (uploaded.mediaId) {
            await tripsService.attachCheckInMedia(tripId, checkIn.id, uploaded.mediaId);
          }
        } catch (mediaErr) {
          Alert.alert(
            'Check-in đã lưu',
            formatApiError(mediaErr, 'Ảnh chưa gắn được — bạn có thể thử lại sau.'),
          );
        }
      }

      setNote('');
      setImageUri(null);
      onDone();
      onClose();
    } catch (e) {
      Alert.alert('Lỗi', formatApiError(e, 'Check-in thất bại'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: card }]}>
          <ThemedText type="subtitle">Check-in</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }} numberOfLines={2}>
            {placeName}
          </ThemedText>
          <ThemedText style={{ color: muted, fontSize: 12 }}>GPS tuỳ chọn · ảnh tuỳ chọn</ThemedText>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú ngắn..."
            placeholderTextColor={muted}
            multiline
            style={[styles.input, { borderColor: border, color: text, minHeight: 72 }]}
          />

          <PressableScale style={[styles.secondary, { borderColor: tint }]} onPress={pickImage}>
            <ThemedText style={{ color: tint, fontWeight: '700' }}>
              {imageUri ? 'Đã chọn 1 ảnh · đổi ảnh' : 'Thêm ảnh'}
            </ThemedText>
          </PressableScale>

          <View style={styles.actions}>
            <PressableScale style={[styles.secondary, { borderColor: border, flex: 1 }]} onPress={onClose} disabled={busy}>
              <ThemedText style={{ fontWeight: '600' }}>Huỷ</ThemedText>
            </PressableScale>
            <PressableScale
              style={[styles.primary, { backgroundColor: cta, flex: 1 }]}
              onPress={() => void submit()}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color={onCta} />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                  Lưu check-in
                </ThemedText>
              )}
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
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primary: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
