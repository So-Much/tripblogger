import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripMapSearchBar } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView } from '@/src/components/trips/TripMapView';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import type { MapCheckpoint } from '@/src/types/trip-map';
import { formatApiError } from '@/src/utils/format-api-error';

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TripCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    name?: string;
    locationId?: string;
  }>();

  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');

  const initialStay = useMemo<MapCheckpoint | null>(() => {
    const lat = params.lat ? Number(params.lat) : NaN;
    const lng = params.lng ? Number(params.lng) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat,
      lng,
      name: typeof params.name === 'string' && params.name.trim() ? params.name : 'Nơi ở',
      locationId: typeof params.locationId === 'string' ? params.locationId : undefined,
    };
  }, [params.lat, params.lng, params.name, params.locationId]);

  const [step, setStep] = useState<1 | 2>(initialStay ? 2 : 1);
  const [stay, setStay] = useState<MapCheckpoint | null>(initialStay);

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [destinationName, setDestinationName] = useState(initialStay?.name ?? '');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 2));
  const [error, setError] = useState<string | null>(null);

  const mapCenter = stay ? { latitude: stay.lat, longitude: stay.lng } : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!stay) throw new Error('Chọn nơi ở trước');
      const trip = await tripsService.create({
        title: title.trim(),
        destinationName: destinationName.trim() || stay.name,
        startDate,
        endDate,
      });

      const accomBody = stay.locationId
        ? {
            locationId: stay.locationId,
            checkIn: startDate,
            checkOut: endDate,
            isPrimary: true,
          }
        : {
            customName: stay.name,
            lat: stay.lat,
            lng: stay.lng,
            checkIn: startDate,
            checkOut: endDate,
            isPrimary: true,
          };

      await tripsService.addAccommodation(trip.id, accomBody);
      try {
        await tripsService.refreshRecommendations(trip.id);
      } catch {
        // recommendations optional on create
      }
      return trip;
    },
    onSuccess: (trip) => {
      router.replace({ pathname: '/(tabs)/trips/[id]', params: { id: trip.id } });
    },
    onError: (e) => setError(formatApiError(e, 'Không tạo được chuyến đi')),
  });

  if (step === 1) {
    return (
      <ThemedView style={styles.flex}>
        {mapCenter ? (
          <TripMapView
            center={mapCenter}
            checkpoint={stay}
            pins={[]}
            onMapPress={(coords) =>
              setStay({ lat: coords.lat, lng: coords.lng, name: 'Vị trí đã chọn' })
            }
          />
        ) : (
          <View style={[styles.placeholderMap, { backgroundColor: card, borderColor: border }]}>
            <ThemedText style={{ color: muted }}>Chọn nơi ở trên bản đồ hoặc tìm kiếm bên dưới</ThemedText>
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={[styles.stepPanel, { backgroundColor: `${card}F0` }]}>
          <ThemedText type="subtitle">Bước 1: Chọn nơi ở</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }}>
            Điểm mốc giúp gợi ý các địa điểm tốt xung quanh khi bạn đi du lịch.
          </ThemedText>
          <TripMapSearchBar
            userLat={stay?.lat}
            userLng={stay?.lng}
            checkpoint={stay}
            onSelectCheckpoint={(cp) => setStay(cp)}
            onClearCheckpoint={() => setStay(null)}
          />
          {stay ? (
            <ThemedText type="defaultSemiBold" numberOfLines={2}>
              {stay.name}
            </ThemedText>
          ) : null}
          <Pressable
            style={[styles.btn, { backgroundColor: tint, opacity: stay ? 1 : 0.5 }]}
            disabled={!stay}
            onPress={() => {
              setDestinationName(stay?.name ?? '');
              setStep(2);
            }}>
            <ThemedText style={styles.btnText}>Tiếp tục</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Bước 2: Chi tiết chuyến đi</ThemedText>
        {stay ? (
          <View style={[styles.stayChip, { borderColor: border, backgroundColor: card }]}>
            <ThemedText style={{ color: muted, fontSize: 12 }}>Nơi ở</ThemedText>
            <ThemedText type="defaultSemiBold">{stay.name}</ThemedText>
            <Pressable onPress={() => setStep(1)}>
              <ThemedText style={{ color: tint, fontSize: 13 }}>Đổi</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Tiêu đề"
          placeholderTextColor={muted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Điểm đến"
          placeholderTextColor={muted}
          value={destinationName}
          onChangeText={setDestinationName}
        />
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Ngày đi (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Ngày về (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
        />
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        <Pressable
          style={[styles.btn, { backgroundColor: tint }]}
          disabled={!title.trim() || mutation.isPending}
          onPress={() => mutation.mutate()}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.btnText}>Tạo chuyến đi</ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, gap: 12 },
  stepPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 10,
  },
  placeholderMap: {
    flex: 1,
    margin: 16,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  stayChip: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c00' },
});
