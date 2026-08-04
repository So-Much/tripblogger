import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import type { FeaturedLocationDto } from '@/src/types/template-cook';
import { formatApiError } from '@/src/utils/format-api-error';
import { slotTypeLabel } from '@/src/utils/template-cook';

type SlotFilter = 'ALL' | 'POI' | 'FOOD';

export function TripPickScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = String(tripId);
  const router = useRouter();
  const qc = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const [filter, setFilter] = useState<SlotFilter>('ALL');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const tripQuery = useQuery({
    queryKey: ['trips', id],
    queryFn: () => tripsService.getById(id),
    enabled: !!id,
  });

  const featuredQuery = useQuery({
    queryKey: ['destinations', 'DALAT', 'featured', filter],
    queryFn: () =>
      tripsService.featuredLocations(
        'DALAT',
        filter === 'ALL' ? undefined : filter,
      ),
  });

  useEffect(() => {
    const ids = tripQuery.data?.pickLocationIds;
    if (ids) setPicked(new Set(ids));
  }, [tripQuery.data?.pickLocationIds]);

  const items = useMemo(() => {
    const list = featuredQuery.data?.items ?? [];
    if (filter === 'ALL') return list.filter((x) => x.slotType === 'POI' || x.slotType === 'FOOD');
    return list;
  }, [featuredQuery.data?.items, filter]);

  const toggle = (locId: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => tripsService.setPicks(id, [...picked]),
    onSuccess: (trip) => {
      void qc.setQueryData(['trips', id], trip);
      router.push(`/(tabs)/trips/create/cook?tripId=${id}` as Href);
    },
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không lưu được danh sách điểm')),
  });

  const renderItem = ({ item }: { item: FeaturedLocationDto }) => {
    const active = picked.has(item.id);
    return (
      <Pressable
        style={[
          styles.row,
          {
            borderColor: active ? tint : border,
            backgroundColor: active ? `${tint}12` : card,
          },
        ]}
        onPress={() => toggle(item.id)}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
            {slotTypeLabel(item.slotType)}
            {item.address ? ` · ${item.address}` : ''}
          </ThemedText>
        </View>
        <View style={[styles.plus, { borderColor: tint, backgroundColor: active ? tint : 'transparent' }]}>
          <ThemedText style={{ color: active ? onCta : tint, fontWeight: '800' }}>
            {active ? '✓' : '+'}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <View style={styles.head}>
          <ThemedText type="subtitle">Chọn điểm</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }}>
            Đã chọn {picked.size} điểm · chưa xếp ngày
          </ThemedText>
          <View style={styles.filters}>
            {(['ALL', 'POI', 'FOOD'] as SlotFilter[]).map((f) => {
              const active = filter === f;
              const label = f === 'ALL' ? 'Tất cả' : f === 'POI' ? 'Tham quan' : 'Ăn uống';
              return (
                <PressableScale
                  key={f}
                  style={[
                    styles.chip,
                    active ? { borderColor: tint, backgroundColor: `${tint}18` } : { borderColor: border },
                  ]}
                  onPress={() => setFilter(f)}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{label}</ThemedText>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {featuredQuery.isLoading || tripQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={tint} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(x) => x.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText style={{ textAlign: 'center', color: muted, marginTop: 40 }}>
                Chưa có điểm featured. Có thể tiếp tục với 0 điểm.
              </ThemedText>
            }
          />
        )}

        <View style={styles.footer}>
          <PressableScale
            style={[styles.cta, { backgroundColor: cta }]}
            disabled={save.isPending}
            onPress={() => save.mutate()}>
            {save.isPending ? (
              <ActivityIndicator color={onCta} />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
                Tiếp: Nấu lịch trình
              </ThemedText>
            )}
          </PressableScale>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  head: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  list: { padding: 16, gap: 10, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: 16, paddingBottom: 12 },
  cta: {
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
