import { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripDayCard } from '@/src/components/trips/TripDayCard';
import { TripDetailActions } from '@/src/components/trips/TripDetailActions';
import { TripDetailHero } from '@/src/components/trips/TripDetailHero';
import { TripRecommendationsPanel } from '@/src/components/trips/TripRecommendationsPanel';
import { TripStatsRow } from '@/src/components/trips/TripStatsRow';
import { tripsService } from '@/src/services/api/trips.service';
import { formatApiError } from '@/src/utils/format-api-error';

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = String(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'textMuted');
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
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không tạo được gợi ý')),
  });

  const invalidateTripQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    void queryClient.invalidateQueries({ queryKey: ['trips', 'active-or-planning'] });
    void queryClient.invalidateQueries({ queryKey: ['trips', 'route'] });
  };

  const goToMapWithNavigation = () => {
    router.replace({ pathname: '/(tabs)/trips', params: { navigateNext: '1' } });
  };

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'COMPLETED') => tripsService.updateStatus(tripId, status),
    onSuccess: (_updated, status) => {
      invalidateTripQueries();
      if (status === 'ACTIVE') {
        goToMapWithNavigation();
      }
    },
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không cập nhật được trạng thái')),
  });

  const stopAction = useMutation({
    mutationFn: ({ stopId, action }: { stopId: string; action: 'checkin' | 'complete' }) =>
      action === 'checkin'
        ? tripsService.checkinStop(tripId, stopId)
        : tripsService.completeStop(tripId, stopId),
    onSuccess: () => invalidateTripQueries(),
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không cập nhật điểm dừng')),
  });

  const trip = tripQuery.data;
  const days = trip?.days ?? [];
  const isActive = trip?.status === 'ACTIVE';
  const totalStops = days.reduce((sum, d) => sum + d.stops.length, 0);

  const onRefresh = () => {
    void tripQuery.refetch();
    if (showRecs) void recsQuery.refetch();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['bottom']}>
      {tripQuery.isLoading || !trip ? (
        <ActivityIndicator style={styles.loader} color={tint} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={tripQuery.isRefetching} onRefresh={onRefresh} tintColor={tint} />
          }>
          <TripDetailHero trip={trip} />

          <TripStatsRow days={days} showProgress={isActive || trip.status === 'COMPLETED'} />

          <TripDetailActions
            status={trip.status}
            totalStops={totalStops}
            showRecommendations={showRecs}
            isStarting={statusMutation.isPending}
            isRefreshingRecs={refreshRecs.isPending}
            onStart={() => statusMutation.mutate('ACTIVE')}
            onNavigateNext={goToMapWithNavigation}
            onComplete={() => statusMutation.mutate('COMPLETED')}
            onToggleRecommendations={() => setShowRecs((v) => !v)}
            onRefreshRecommendations={() => refreshRecs.mutate()}
          />

          {showRecs ? (
            <TripRecommendationsPanel items={recsQuery.data ?? []} loading={recsQuery.isLoading} />
          ) : null}

          <View style={styles.sectionHead}>
            <ThemedText type="subtitle">Lịch trình</ThemedText>
            <ThemedText style={{ color: muted, fontSize: 13 }}>
              {days.length} ngày · {totalStops} điểm
            </ThemedText>
          </View>

          {days.length === 0 ? (
            <ThemedText style={{ color: muted, textAlign: 'center', marginTop: 8 }}>
              Chưa có ngày trong lịch trình.
            </ThemedText>
          ) : (
            days.map((day) => (
              <TripDayCard
                key={day.id}
                day={day}
                isActiveTrip={isActive}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/trips/[id]/day/[dayId]',
                    params: { id: tripId, dayId: day.id },
                  })
                }
                onCheckin={(stopId) => stopAction.mutate({ stopId, action: 'checkin' })}
                onComplete={(stopId) => stopAction.mutate({ stopId, action: 'complete' })}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  loader: { marginTop: 40 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
