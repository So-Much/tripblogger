import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import type { EventBlockDto, FeaturedLocationDto, StayVibe } from '@/src/types/template-cook';
import { formatApiError } from '@/src/utils/format-api-error';
import { eventBlockName, slotTypeLabel } from '@/src/utils/template-cook';

type DayListItem = EventBlockDto & { listKey: string };

export function TripCookScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = String(tripId);
  const router = useRouter();
  const qc = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const text = useThemeColor({}, 'text');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const [manual, setManual] = useState(false);
  const [accomOpen, setAccomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | 'unscheduled' | null>(null);

  const tripQuery = useQuery({
    queryKey: ['trips', id],
    queryFn: () => tripsService.getById(id),
    enabled: !!id,
  });

  const trip = tripQuery.data;
  const days = trip?.days ?? [];
  const unscheduled = trip?.unscheduled ?? [];
  const primaryAccom = trip?.accommodations?.find((a) => a.isPrimary) ?? trip?.accommodations?.[0];
  const vibe = (primaryAccom?.vibe as StayVibe | null | undefined) ?? null;

  const staysQuery = useQuery({
    queryKey: ['destinations', 'DALAT', 'featured', 'STAY'],
    queryFn: () => tripsService.featuredLocations('DALAT', 'STAY'),
    enabled: accomOpen,
  });

  const stayItems = useMemo(() => {
    const items = staysQuery.data?.items ?? [];
    if (!vibe) return items;
    return items.filter((s) => (s.vibeTags ?? []).includes(vibe));
  }, [staysQuery.data?.items, vibe]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['trips', id] });
  };

  const cook = useMutation({
    mutationFn: () => tripsService.cook(id),
    onSuccess: (data) => {
      void qc.setQueryData(['trips', id], data);
      if (!activeDayId && data.days?.[0]?.id) setActiveDayId(data.days[0].id);
    },
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Nấu lịch thất bại')),
  });

  const startTrip = useMutation({
    mutationFn: () => tripsService.updateStatus(id, 'ACTIVE'),
    onSuccess: () => {
      invalidate();
      router.replace(`/(tabs)/trips/${id}` as Href);
    },
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không bắt đầu được chuyến')),
  });

  const saveAccom = useMutation({
    mutationFn: async () => {
      if (selectedStayId) {
        return tripsService.setAccommodation(id, {
          mode: 'VIBE',
          vibe: vibe ?? 'CENTRAL',
          locationId: selectedStayId,
        });
      }
      if (!customName.trim()) throw new Error('Nhập tên chỗ ở');
      return tripsService.setAccommodation(id, {
        mode: 'CUSTOM',
        customName: customName.trim(),
      });
    },
    onSuccess: (data) => {
      void qc.setQueryData(['trips', id], data);
      setAccomOpen(false);
    },
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không lưu chỗ ở')),
  });

  const reorder = useMutation({
    mutationFn: (items: { blockId: string; tripDayId: string | null; orderIndex: number }[]) =>
      tripsService.reorderBlocks(id, items),
    onSuccess: () => invalidate(),
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không sắp xếp được')),
  });

  const selectedDayBlocks: DayListItem[] = useMemo(() => {
    if (!activeDayId) {
      const first = days[0];
      if (first) {
        return first.eventBlocks.map((b) => ({ ...b, listKey: b.id }));
      }
      return unscheduled.map((b) => ({ ...b, listKey: b.id }));
    }
    if (activeDayId === 'unscheduled') {
      return unscheduled.map((b) => ({ ...b, listKey: b.id }));
    }
    const day = days.find((d) => d.id === activeDayId);
    return (day?.eventBlocks ?? []).map((b) => ({ ...b, listKey: b.id }));
  }, [activeDayId, days, unscheduled]);

  const currentDayId =
    activeDayId ?? days[0]?.id ?? (unscheduled.length ? 'unscheduled' : null);

  const onDragEnd = useCallback(
    ({ data }: { data: DayListItem[] }) => {
      if (!manual || !currentDayId) return;
      const tripDayId = currentDayId === 'unscheduled' ? null : currentDayId;
      const items = data
        .filter((b) => b.status !== 'DONE')
        .map((b, index) => ({
          blockId: b.id,
          tripDayId,
          orderIndex: index,
        }));
      if (items.length) reorder.mutate(items);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [manual, currentDayId, reorder],
  );

  const renderBlock = ({ item, drag, isActive }: RenderItemParams<DayListItem>) => {
    const done = item.status === 'DONE';
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={manual && !done ? drag : undefined}
          disabled={isActive}
          style={[
            styles.block,
            {
              borderColor: border,
              backgroundColor: card,
              opacity: done ? 0.45 : isActive ? 0.9 : 1,
            },
          ]}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {eventBlockName(item)}
            </ThemedText>
            <ThemedText style={{ color: muted, fontSize: 12 }}>
              {slotTypeLabel(item.slotType)} · {item.status}
              {item.plannedDurationMin ? ` · ${item.plannedDurationMin}p` : ''}
            </ThemedText>
          </View>
          {manual && !done ? (
            <ThemedText style={{ color: muted, fontSize: 11 }}>Kéo</ThemedText>
          ) : null}
        </Pressable>
      </ScaleDecorator>
    );
  };

  const hasCooked = days.some((d) => (d.eventBlocks?.length ?? 0) > 0) || unscheduled.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ThemedView style={styles.container}>
        {tripQuery.isLoading || !trip ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={tint} />
        ) : (
          <>
            <View style={styles.head}>
              <ThemedText type="subtitle">{trip.title}</ThemedText>
              <ThemedText style={{ color: muted, fontSize: 13 }}>
                {trip.destinationName ?? 'Đà Lạt'} · {trip.nightCount ?? '?'}N
                {(trip.nightCount ?? 0) + 1}Đ · {trip.editMode ?? 'AUTO'}
              </ThemedText>

              <View style={styles.actions}>
                <PressableScale
                  style={[styles.primary, { backgroundColor: cta }]}
                  disabled={cook.isPending}
                  onPress={() => cook.mutate()}>
                  {cook.isPending ? (
                    <ActivityIndicator color={onCta} />
                  ) : (
                    <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                      {hasCooked ? 'Nấu lại' : 'Nấu lịch trình'}
                    </ThemedText>
                  )}
                </PressableScale>
                <PressableScale
                  style={[
                    styles.secondary,
                    manual ? { borderColor: tint, backgroundColor: `${tint}14` } : { borderColor: border },
                  ]}
                  onPress={() => setManual((v) => !v)}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>
                    Manual {manual ? 'ON' : 'OFF'}
                  </ThemedText>
                </PressableScale>
                <PressableScale
                  style={[styles.secondary, { borderColor: border }]}
                  onPress={() => setAccomOpen(true)}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Chỗ ở</ThemedText>
                </PressableScale>
              </View>

              {primaryAccom ? (
                <ThemedText style={{ color: muted, fontSize: 12 }}>
                  Chỗ ở:{' '}
                  {primaryAccom.isPlaceholder
                    ? `Chưa chọn${vibe ? ` (vibe ${vibe})` : ''}`
                    : primaryAccom.location?.name ?? primaryAccom.customName ?? '—'}
                </ThemedText>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
              {days.map((d) => {
                const active = (currentDayId === d.id) || (!activeDayId && d.id === days[0]?.id);
                return (
                  <PressableScale
                    key={d.id}
                    style={[
                      styles.dayChip,
                      active ? { borderColor: tint, backgroundColor: `${tint}18` } : { borderColor: border },
                    ]}
                    onPress={() => setActiveDayId(d.id)}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                      Ngày {d.dayNumber} · {d.eventBlocks?.length ?? 0}
                    </ThemedText>
                  </PressableScale>
                );
              })}
              {unscheduled.length > 0 ? (
                <PressableScale
                  style={[
                    styles.dayChip,
                    currentDayId === 'unscheduled'
                      ? { borderColor: tint, backgroundColor: `${tint}18` }
                      : { borderColor: border },
                  ]}
                  onPress={() => setActiveDayId('unscheduled')}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                    Chưa xếp · {unscheduled.length}
                  </ThemedText>
                </PressableScale>
              ) : null}
            </ScrollView>

            {!hasCooked ? (
              <ThemedText style={{ color: muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 }}>
                Nhấn &quot;Nấu lịch trình&quot; để xếp điểm theo ngày. Có thể nấu với 0 điểm.
              </ThemedText>
            ) : (
              <DraggableFlatList
                data={selectedDayBlocks}
                keyExtractor={(item) => item.listKey}
                onDragBegin={() => void Haptics.selectionAsync()}
                onDragEnd={onDragEnd}
                activationDistance={manual ? 8 : 9999}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <ThemedText style={{ color: muted, textAlign: 'center', marginTop: 24 }}>
                    Ngày trống — thêm điểm hoặc kéo từ Unscheduled
                  </ThemedText>
                }
                renderItem={renderBlock}
              />
            )}

            <View style={styles.footer}>
              <PressableScale
                style={[styles.primary, { backgroundColor: cta }]}
                disabled={startTrip.isPending || !hasCooked}
                onPress={() => startTrip.mutate()}>
                {startTrip.isPending ? (
                  <ActivityIndicator color={onCta} />
                ) : (
                  <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                    Bắt đầu chuyến
                  </ThemedText>
                )}
              </PressableScale>
              <PressableScale
                style={[styles.secondary, { borderColor: border, marginTop: 8 }]}
                onPress={() => router.replace(`/(tabs)/trips/${id}` as Href)}>
                <ThemedText style={{ fontWeight: '600', fontSize: 13 }}>Xem chi tiết trip</ThemedText>
              </PressableScale>
            </View>
          </>
        )}
      </ThemedView>

      <Modal visible={accomOpen} animationType="slide" transparent onRequestClose={() => setAccomOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: card }]}>
            <ThemedText type="subtitle">Chỗ ở</ThemedText>
            <ThemedText style={{ color: muted, fontSize: 13 }}>
              {vibe ? `Curated theo vibe ${vibe}` : 'Chọn curated hoặc nhập custom'}
            </ThemedText>
            {staysQuery.isLoading ? (
              <ActivityIndicator color={tint} />
            ) : (
              <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8 }}>
                {stayItems.map((s: FeaturedLocationDto) => {
                  const active = selectedStayId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      style={[
                        styles.stayRow,
                        active ? { borderColor: tint, backgroundColor: `${tint}12` } : { borderColor: border },
                      ]}
                      onPress={() => {
                        setSelectedStayId(s.id);
                        setCustomName('');
                      }}>
                      <ThemedText type="defaultSemiBold">{s.name}</ThemedText>
                      <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
                        {s.address ?? 'STAY'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>
              Hoặc custom
            </ThemedText>
            <TextInput
              value={customName}
              onChangeText={(v) => {
                setCustomName(v);
                setSelectedStayId(null);
              }}
              placeholder="Tên chỗ ở của bạn"
              placeholderTextColor={muted}
              style={[styles.input, { borderColor: border, color: text }]}
            />
            <View style={styles.sheetActions}>
              <PressableScale style={[styles.secondary, { borderColor: border, flex: 1 }]} onPress={() => setAccomOpen(false)}>
                <ThemedText style={{ fontWeight: '600' }}>Đóng</ThemedText>
              </PressableScale>
              <PressableScale
                style={[styles.primary, { backgroundColor: cta, flex: 1 }]}
                disabled={saveAccom.isPending}
                onPress={() => saveAccom.mutate()}>
                {saveAccom.isPending ? (
                  <ActivityIndicator color={onCta} />
                ) : (
                  <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                    Lưu
                  </ThemedText>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  head: { padding: 16, gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: {
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  dayChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  footer: { padding: 16, paddingTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 10 },
  stayRow: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
