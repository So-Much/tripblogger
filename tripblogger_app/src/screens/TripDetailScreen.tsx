import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDayDto, TripStopDto } from '@/src/types/trip';

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = String(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const [showRecs, setShowRecs] = useState(false);

  const tripQuery = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => tripsService.getById(tripId),
  });

  const recsQuery = useQuery({
    queryKey: ['trips', tripId, 'recommendations'],
    queryFn: () => tripsService.listRecommendations(tripId),
    enabled: showRecs,
  });

  const refreshRecs = useMutation({
    mutationFn: () => tripsService.refreshRecommendations(tripId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'recommendations'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'COMPLETED') => tripsService.updateStatus(tripId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trips', tripId] }),
  });

  const stopAction = useMutation({
    mutationFn: ({ stopId, action }: { stopId: string; action: 'checkin' | 'complete' }) =>
      action === 'checkin'
        ? tripsService.checkinStop(tripId, stopId)
        : tripsService.completeStop(tripId, stopId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trips', tripId] }),
  });

  const trip = tripQuery.data;
  const isActive = trip?.status === 'ACTIVE';

  const stopName = (s: TripStopDto) => s.location?.name ?? s.customName ?? 'Điểm dừng';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {tripQuery.isLoading || !trip ? (
        <ActivityIndicator style={styles.loader} color={tint} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title">{trip.title}</ThemedText>
          <ThemedText style={styles.meta}>
            {trip.destinationName} · {trip.startDate} → {trip.endDate}
          </ThemedText>
          <ThemedText style={styles.meta}>Trạng thái: {trip.status}</ThemedText>
          {trip.actualBudget != null ? (
            <ThemedText style={styles.meta}>Chi tiêu: {trip.actualBudget.toLocaleString()} VND</ThemedText>
          ) : null}

          <ThemedView style={styles.row}>
            {trip.status === 'PLANNING' || trip.status === 'DRAFT' ? (
              <Pressable style={[styles.chip, { borderColor: tint }]} onPress={() => statusMutation.mutate('ACTIVE')}>
                <ThemedText>Bắt đầu chuyến đi</ThemedText>
              </Pressable>
            ) : null}
            {trip.status === 'ACTIVE' ? (
              <Pressable style={[styles.chip, { borderColor: tint }]} onPress={() => statusMutation.mutate('COMPLETED')}>
                <ThemedText>Kết thúc</ThemedText>
              </Pressable>
            ) : null}
            <Pressable style={[styles.chip, { borderColor: border }]} onPress={() => setShowRecs((v) => !v)}>
              <ThemedText>Gợi ý địa điểm</ThemedText>
            </Pressable>
          </ThemedView>

          {showRecs ? (
            <ThemedView style={[styles.section, { borderColor: border }]}>
              <Pressable onPress={() => refreshRecs.mutate()} disabled={refreshRecs.isPending}>
                <ThemedText type="defaultSemiBold">
                  {refreshRecs.isPending ? 'Đang tạo gợi ý…' : 'Làm mới gợi ý'}
                </ThemedText>
              </Pressable>
              {recsQuery.isLoading ? (
                <ActivityIndicator color={tint} />
              ) : (
                (recsQuery.data ?? []).map((r) => (
                  <ThemedText key={r.id} style={styles.rec}>
                    {r.location.name} · {r.score.toFixed(2)} · {r.distanceKm?.toFixed(1)} km
                  </ThemedText>
                ))
              )}
            </ThemedView>
          ) : null}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Lịch trình
          </ThemedText>
          {(trip.days ?? []).map((day: TripDayDto) => (
            <Pressable
              key={day.id}
              style={[styles.dayCard, { borderColor: border }]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/trips/[id]/day/[dayId]',
                  params: { id: tripId, dayId: day.id },
                })
              }>
              <ThemedText type="defaultSemiBold">
                {day.title ?? `Ngày ${day.dayNumber}`} · {day.date}
              </ThemedText>
              <ThemedText style={styles.meta}>{day.stops.length} điểm dừng</ThemedText>
              {isActive
                ? day.stops.map((s) => (
                    <ThemedView key={s.id} style={styles.stopRow}>
                      <ThemedText>
                        {stopName(s)} — {s.status}
                      </ThemedText>
                      {s.status === 'PLANNED' ? (
                        <Pressable onPress={() => stopAction.mutate({ stopId: s.id, action: 'checkin' })}>
                          <ThemedText style={{ color: tint }}>Check-in</ThemedText>
                        </Pressable>
                      ) : null}
                      {s.status === 'VISITING' ? (
                        <Pressable onPress={() => stopAction.mutate({ stopId: s.id, action: 'complete' })}>
                          <ThemedText style={{ color: tint }}>Hoàn thành</ThemedText>
                        </Pressable>
                      ) : null}
                    </ThemedView>
                  ))
                : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  loader: { marginTop: 40 },
  meta: { fontSize: 14, opacity: 0.75 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  section: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 },
  sectionTitle: { marginTop: 12 },
  dayCard: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rec: { fontSize: 13 },
});
