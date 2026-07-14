import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { TripStatsRow } from '@/src/components/trips/TripStatsRow';
import { TripStatusBadge } from '@/src/components/trips/TripStatusBadge';
import { TripStopTimeline } from '@/src/components/trips/TripStopTimeline';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { tripsService } from '@/src/services/api/trips.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { formatTripDate } from '@/src/utils/trip-display';

export function TripDayScreen() {
  const { t } = useI18n();
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const tripId = String(id);
  const dayIdStr = String(dayId);
  const queryClient = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const [customName, setCustomName] = useState('');

  const tripQuery = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => tripsService.getById(tripId),
  });

  const dayQuery = useQuery({
    queryKey: ['trips', tripId, 'days', dayIdStr],
    queryFn: () => tripsService.getDay(tripId, dayIdStr),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'days', dayIdStr] });
  };

  const addStop = useMutation({
    mutationFn: async () => {
      const name = customName.trim();
      if (!name) return;
      await tripsService.addStop(tripId, dayIdStr, { customName: name });
    },
    onSuccess: () => {
      setCustomName('');
      invalidate();
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripAddStopFailed'))),
  });

  const stopAction = useMutation({
    mutationFn: ({ stopId, action }: { stopId: string; action: 'checkin' | 'complete' }) =>
      action === 'checkin'
        ? tripsService.checkinStop(tripId, stopId)
        : tripsService.completeStop(tripId, stopId),
    onSuccess: invalidate,
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripStopUpdateFailed'))),
  });

  const day = dayQuery.data;
  const trip = tripQuery.data;
  const isActive = trip?.status === 'ACTIVE';
  const loading = dayQuery.isLoading || !day;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={tint} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.dayHero, { backgroundColor: card, borderColor: border }]}>
            <View style={[styles.dayNumber, { backgroundColor: `${tint}18` }]}>
              <ThemedText style={{ color: tint, fontWeight: '800', fontSize: 22 }}>{day.dayNumber}</ThemedText>
            </View>
            <View style={styles.dayHeroText}>
              <ThemedText type="subtitle" style={styles.dayTitle}>
                {day.title ?? t('tripDayLabel', { number: day.dayNumber })}
              </ThemedText>
              <ThemedText style={{ color: muted, fontSize: 14 }}>{formatTripDate(day.date)}</ThemedText>
              {day.theme ? (
                <ThemedText style={{ color: muted, fontSize: 13, fontStyle: 'italic' }}>{day.theme}</ThemedText>
              ) : null}
            </View>
            {trip ? <TripStatusBadge kind="trip" status={trip.status} /> : null}
          </View>

          <TripStatsRow days={[day]} showProgress={isActive} />

          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            {t('tripStopsSection')}
          </ThemedText>

          <TripStopTimeline
            stops={day.stops}
            isActiveTrip={isActive}
            onCheckin={(stopId) => stopAction.mutate({ stopId, action: 'checkin' })}
            onComplete={(stopId) => stopAction.mutate({ stopId, action: 'complete' })}
          />

          <View style={[styles.addSection, { borderColor: border, backgroundColor: card }]}>
            <View style={styles.addHeader}>
              <IconSymbol name="plus.circle.fill" size={22} color={tint} />
              <ThemedText type="defaultSemiBold">{t('tripAddStopTitle')}</ThemedText>
            </View>
            <ThemedText style={{ color: muted, fontSize: 13, marginBottom: 4 }}>
              {t('tripAddStopHint')}
            </ThemedText>
            <ThemedTextInput
              placeholder={t('tripAddStopPlaceholder')}
              value={customName}
              onChangeText={setCustomName}
              returnKeyType="done"
              onSubmitEditing={() => addStop.mutate()}
            />
            <PressableScale
              style={[styles.addBtn, { backgroundColor: cta, opacity: !customName.trim() || addStop.isPending ? 0.5 : 1 }]}
              onPress={() => addStop.mutate()}
              disabled={addStop.isPending || !customName.trim()}>
              {addStop.isPending ? (
                <ActivityIndicator color={onCta} />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                  {t('tripAddStopToDay')}
                </ThemedText>
              )}
            </PressableScale>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  loader: { marginTop: 40 },
  dayHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  dayNumber: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeroText: { flex: 1, gap: 4 },
  dayTitle: { fontSize: 20 },
  sectionLabel: { marginTop: 4 },
  addSection: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  addHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
});
