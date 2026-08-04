import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CheckInSheet } from '@/src/components/trips/CheckInSheet';
import { EventBlockCard } from '@/src/components/trips/EventBlockCard';
import { SwapSheet } from '@/src/components/trips/SwapSheet';
import { TripDetailHero } from '@/src/components/trips/TripDetailHero';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { tripsService } from '@/src/services/api/trips.service';
import type { EventBlockDto, FeaturedLocationDto } from '@/src/types/template-cook';
import { formatApiError } from '@/src/utils/format-api-error';
import { eventBlockName, todayIsoDate } from '@/src/utils/template-cook';

export function TripDetailScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = String(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const [selectedDayId, setSelectedDayId] = useState<string | 'unscheduled' | null>(null);
  const [checkInBlock, setCheckInBlock] = useState<EventBlockDto | null>(null);
  const [swapBlock, setSwapBlock] = useState<EventBlockDto | null>(null);
  const [customSwapName, setCustomSwapName] = useState('');
  const [candidates, setCandidates] = useState<FeaturedLocationDto[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const tripQuery = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => tripsService.getById(tripId),
  });

  const trip = tripQuery.data;
  const days = trip?.days ?? [];
  const unscheduled = trip?.unscheduled ?? [];
  const isLive = trip?.status === 'ACTIVE' || trip?.status === 'COMPLETED';
  const isPlanning = trip?.status === 'PLANNING' || trip?.status === 'DRAFT';

  useEffect(() => {
    if (!days.length || selectedDayId) return;
    const today = todayIsoDate();
    const todayDay = days.find((d) => d.date === today);
    setSelectedDayId(todayDay?.id ?? days[0]?.id ?? null);
  }, [days, selectedDayId]);

  const activeDay = useMemo(() => {
    if (selectedDayId === 'unscheduled') return null;
    return days.find((d) => d.id === selectedDayId) ?? days[0] ?? null;
  }, [days, selectedDayId]);

  const blocks: EventBlockDto[] =
    selectedDayId === 'unscheduled' ? unscheduled : (activeDay?.eventBlocks ?? []);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    void queryClient.invalidateQueries({ queryKey: ['trips', 'mine'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'COMPLETED') => tripsService.updateStatus(tripId, status),
    onSuccess: () => invalidate(),
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('tripStatusUpdateFailed'))),
  });

  const assemble = useMutation({
    mutationFn: () => tripsService.assembleDraftPost(tripId),
    onSuccess: (res) => {
      router.push(`/(tabs)/posts/create?postId=${res.postId}`);
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, 'Không tạo được bản nháp blog')),
  });

  const swapMutation = useMutation({
    mutationFn: (body: { locationId?: string; customName?: string }) =>
      tripsService.swapBlock(tripId, swapBlock!.id, body),
    onSuccess: () => {
      setSwapBlock(null);
      setCustomSwapName('');
      invalidate();
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, 'Đổi điểm thất bại')),
  });

  const openSwap = async (block: EventBlockDto) => {
    setSwapBlock(block);
    setCustomSwapName('');
    setCandidatesLoading(true);
    try {
      const items = await tripsService.swapCandidates(tripId, block.id);
      setCandidates(items);
    } catch (e) {
      setCandidates([]);
      Alert.alert(t('errorTitle'), formatApiError(e, 'Không tải được ứng viên'));
    } finally {
      setCandidatesLoading(false);
    }
  };

  const deleteTrip = useMutation({
    mutationFn: () => tripsService.delete(tripId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'mine'] });
      router.replace('/(tabs)/trips/my');
    },
  });

  const continueWizard = () => {
    const hasBlocks =
      days.some((d) => (d.eventBlocks?.length ?? 0) > 0) || unscheduled.length > 0;
    if (!hasBlocks) {
      router.push(`/(tabs)/trips/create/pick?tripId=${tripId}` as Href);
    } else {
      router.push(`/(tabs)/trips/create/cook?tripId=${tripId}` as Href);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['bottom']}>
      {tripQuery.isLoading || !trip ? (
        <ActivityIndicator style={styles.loader} color={tint} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={tripQuery.isRefetching}
              onRefresh={() => void tripQuery.refetch()}
              tintColor={tint}
            />
          }>
          <TripDetailHero trip={trip as never} />

          <ThemedText style={{ color: muted, fontSize: 13 }}>
            {trip.destinationName ?? 'Đà Lạt'} · {trip.nightCount ?? '—'}N · {trip.editMode ?? 'AUTO'} ·{' '}
            {trip.checkInCount ?? 0} check-in
          </ThemedText>

          <View style={styles.actions}>
            {isPlanning ? (
              <>
                <PressableScale
                  style={[styles.primary, { backgroundColor: cta }]}
                  onPress={continueWizard}>
                  <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                    Tiếp tục lên lịch
                  </ThemedText>
                </PressableScale>
                <PressableScale
                  style={[styles.secondary, { borderColor: border, backgroundColor: card }]}
                  disabled={statusMutation.isPending}
                  onPress={() => statusMutation.mutate('ACTIVE')}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Bắt đầu chuyến</ThemedText>
                </PressableScale>
              </>
            ) : null}

            {trip.status === 'ACTIVE' ? (
              <PressableScale
                style={[styles.secondary, { borderColor: border, backgroundColor: card }]}
                disabled={statusMutation.isPending}
                onPress={() => statusMutation.mutate('COMPLETED')}>
                <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Kết thúc chuyến</ThemedText>
              </PressableScale>
            ) : null}

            {(trip.status === 'ACTIVE' || trip.status === 'COMPLETED') ? (
              <PressableScale
                style={[styles.primary, { backgroundColor: cta }]}
                disabled={assemble.isPending}
                onPress={() => assemble.mutate()}>
                {assemble.isPending ? (
                  <ActivityIndicator color={onCta} />
                ) : (
                  <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                    Tạo bài Blog
                  </ThemedText>
                )}
              </PressableScale>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
            {days.map((d) => {
              const active = activeDay?.id === d.id && selectedDayId !== 'unscheduled';
              const isToday = d.date === todayIsoDate();
              return (
                <Pressable
                  key={d.id}
                  style={[
                    styles.dayChip,
                    active
                      ? { borderColor: tint, backgroundColor: `${tint}18` }
                      : { borderColor: border, backgroundColor: card },
                  ]}
                  onPress={() => setSelectedDayId(d.id)}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                    Ngày {d.dayNumber}
                    {isToday ? ' · hôm nay' : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
            {unscheduled.length > 0 ? (
              <Pressable
                style={[
                  styles.dayChip,
                  selectedDayId === 'unscheduled'
                    ? { borderColor: tint, backgroundColor: `${tint}18` }
                    : { borderColor: border, backgroundColor: card },
                ]}
                onPress={() => setSelectedDayId('unscheduled')}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                  Chưa xếp · {unscheduled.length}
                </ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.sectionHead}>
            <ThemedText type="subtitle">
              {selectedDayId === 'unscheduled'
                ? 'Điểm chưa xếp'
                : activeDay
                  ? `Ngày ${activeDay.dayNumber} · ${activeDay.date}`
                  : 'Lịch trình'}
            </ThemedText>
          </View>

          {blocks.length === 0 ? (
            <ThemedText style={{ color: muted, textAlign: 'center', marginTop: 8 }}>
              Chưa có điểm trong ngày này.
            </ThemedText>
          ) : (
            blocks.map((block) => (
              <EventBlockCard
                key={block.id}
                block={block}
                showLiveActions={isLive || trip.status === 'PLANNING'}
                onCheckIn={() => setCheckInBlock(block)}
                onSwap={() => void openSwap(block)}
              />
            ))
          )}

          <View style={[styles.dangerZone, { borderColor: border }]}>
            <PressableScale
              onPress={() =>
                Alert.alert('Xóa chuyến đi?', 'Hành động này không thể hoàn tác.', [
                  { text: t('cancel'), style: 'cancel' },
                  {
                    text: t('continueAction'),
                    style: 'destructive',
                    onPress: () => deleteTrip.mutate(),
                  },
                ])
              }>
              <ThemedText style={{ color: '#c62828', fontWeight: '700' }}>Xóa trip</ThemedText>
            </PressableScale>
          </View>
        </ScrollView>
      )}

      {checkInBlock ? (
        <CheckInSheet
          visible
          tripId={tripId}
          eventBlockId={checkInBlock.id}
          placeName={eventBlockName(checkInBlock)}
          onClose={() => setCheckInBlock(null)}
          onDone={invalidate}
        />
      ) : null}

      <SwapSheet
        visible={!!swapBlock}
        loading={candidatesLoading}
        candidates={candidates}
        customName={customSwapName}
        onChangeCustomName={setCustomSwapName}
        submitting={swapMutation.isPending}
        onClose={() => setSwapBlock(null)}
        onSelect={(locationId) => swapMutation.mutate({ locationId })}
        onCustom={() => swapMutation.mutate({ customName: customSwapName.trim() })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  loader: { marginTop: 40 },
  actions: { gap: 8 },
  primary: {
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dayChips: { gap: 8, paddingVertical: 2 },
  dayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionHead: { marginTop: 4 },
  dangerZone: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    alignItems: 'flex-start',
  },
});
