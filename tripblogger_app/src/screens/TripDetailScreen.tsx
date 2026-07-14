import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
import { useI18n } from '@/src/i18n';
import { tripsService } from '@/src/services/api/trips.service';
import { formatApiError } from '@/src/utils/format-api-error';

export function TripDetailScreen() {
  const { t } = useI18n();
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
  const journalQuery = useQuery({
    queryKey: ['trips', tripId, 'journal'],
    queryFn: () => tripsService.getJournal(tripId),
  });

  const refreshRecs = useMutation({
    mutationFn: () => tripsService.refreshRecommendations(tripId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'recommendations'] });
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripRecsRefreshFailed'))),
  });
  const dismissRec = useMutation({
    mutationFn: (recId: string) => tripsService.dismissRecommendation(tripId, recId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'recommendations'] }),
  });
  const addRec = useMutation({
    mutationFn: async (rec: NonNullable<(typeof recsQuery.data)>[number]) => {
      const firstDayId = tripQuery.data?.days?.[0]?.id;
      if (!firstDayId) return;
      await tripsService.addStop(tripId, firstDayId, { locationId: rec.location.id });
      await tripsService.markRecommendationAdded(tripId, rec.id);
    },
    onSuccess: () => {
      invalidateTripQueries();
      void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'recommendations'] });
    },
  });

  const invalidateTripQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    void queryClient.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
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
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripStatusUpdateFailed'))),
  });
  const duplicateTrip = useMutation({
    mutationFn: () => tripsService.duplicate(tripId),
    onSuccess: (newTrip) => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'mine'] });
      router.replace({ pathname: '/(tabs)/trips/[id]', params: { id: newTrip.id } });
    },
  });
  const deleteTrip = useMutation({
    mutationFn: () => tripsService.delete(tripId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'mine'] });
      router.replace('/(tabs)/trips/my');
    },
  });
  const unlinkPost = useMutation({
    mutationFn: (postId: string) => tripsService.unlinkTripPost(tripId, postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'journal'] });
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripRecsRefreshFailed'))),
  });

  const stopAction = useMutation({
    mutationFn: ({ stopId, action }: { stopId: string; action: 'checkin' | 'complete' }) =>
      action === 'checkin'
        ? tripsService.checkinStop(tripId, stopId)
        : tripsService.completeStop(tripId, stopId),
    onSuccess: () => invalidateTripQueries(),
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripStopUpdateFailed'))),
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
            onDuplicate={() => duplicateTrip.mutate()}
            onDelete={() =>
              Alert.alert('Xoa chuyen di?', 'Hanh dong nay khong the hoan tac.', [
                { text: t('cancel'), style: 'cancel' },
                { text: t('continueAction'), style: 'destructive', onPress: () => deleteTrip.mutate() },
              ])
            }
          />

          {showRecs ? (
            <TripRecommendationsPanel
              items={recsQuery.data ?? []}
              loading={recsQuery.isLoading}
              onAdd={(item) => addRec.mutate(item)}
              onDismiss={(item) => dismissRec.mutate(item.id)}
            />
          ) : null}

          <View style={styles.sectionHead}>
            <ThemedText type="subtitle">Nhat ky chuyen di</ThemedText>
          </View>
          {(journalQuery.data?.days ?? []).map((day) => (
            <View key={`journal-${day.id}`} style={styles.journalCard}>
              <ThemedText type="defaultSemiBold">
                Ngay {day.dayNumber} - {day.date}
              </ThemedText>
              {day.stops.map((stop) => (
                <ThemedText key={stop.stopId} style={{ color: muted, fontSize: 13 }}>
                  • {stop.name} ({stop.status})
                </ThemedText>
              ))}
              {day.posts.map((post) => (
                <View key={post.postId} style={styles.journalPostRow}>
                  <ThemedText style={{ flex: 1 }} numberOfLines={1}>
                    {post.title}
                  </ThemedText>
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert('Go lien ket bai viet?', post.title, [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('continueAction'), style: 'destructive', onPress: () => unlinkPost.mutate(post.postId) },
                      ])
                    }>
                    <ThemedText style={{ color: '#c62828', fontWeight: '700' }}>Go</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.sectionHead}>
            <ThemedText type="subtitle">{t('tripItinerary')}</ThemedText>
            <ThemedText style={{ color: muted, fontSize: 13 }}>
              {t('tripItinerarySummary', { days: days.length, stops: totalStops })}
            </ThemedText>
          </View>

          {days.length === 0 ? (
            <ThemedText style={{ color: muted, textAlign: 'center', marginTop: 8 }}>
              {t('tripNoDaysInItinerary')}
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
  journalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#9994',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  journalPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
