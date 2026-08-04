import { useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { tripsService } from '@/src/services/api/trips.service';
import { useTripMapStore } from '@/src/store/trip-map.store';
import type { TripDto } from '@/src/types/trip';

export function TripListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trips', 'mine'],
    queryFn: () => tripsService.listMine({ limit: 50 }),
  });
  const plans = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const favoritePlans = useMemo(() => plans.filter((t) => t.isFavorite), [plans]);
  const planning = useMemo(() => plans.filter((t) => t.status === 'PLANNING' || t.status === 'ACTIVE'), [plans]);
  const history = useMemo(() => plans.filter((t) => t.status === 'COMPLETED' || t.status === 'ARCHIVED' || t.status === 'CANCELLED'), [plans]);
  const toggleFavorite = useMutation({
    mutationFn: async ({ tripId, isFavorite }: { tripId: string; isFavorite: boolean }) =>
      tripsService.update(tripId, { isFavorite }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'mine'] });
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            useTripMapStore.getState().setSelectedTripId(null);
            router.push('/(tabs)/trips/create/frame' as Href);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('tripCreateA11y')}>
          <IconSymbol name="plus.circle.fill" size={28} color={tint} />
        </Pressable>
      ),
    });
  }, [navigation, router, tint, t]);

  const renderItem = ({ item }: { item: TripDto }) => (
    <Pressable
      style={[styles.card, { borderColor: border }]}
      onPress={() => router.push({ pathname: '/(tabs)/trips/[id]', params: { id: item.id } })}>
      <View style={styles.titleRow}>
        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
        <Pressable
          hitSlop={10}
          onPress={() => toggleFavorite.mutate({ tripId: item.id, isFavorite: !item.isFavorite })}>
          <IconSymbol name={item.isFavorite ? 'heart.fill' : 'heart'} size={18} color={item.isFavorite ? '#d11a2a' : tint} />
        </Pressable>
      </View>
      <ThemedText style={styles.meta}>
        {item.destinationName ?? '—'} · {item.startDate} → {item.endDate}
      </ThemedText>
      <ThemedText style={styles.status}>{item.status}</ThemedText>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ThemedView style={styles.container}>
        {query.isLoading ? (
          <ActivityIndicator style={styles.loader} color={tint} />
        ) : (
          <>
            <ThemedText type="defaultSemiBold">{t('tripActivePlans')}</ThemedText>
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setFavoritesOnly((v) => !v)}
                style={[styles.filterChip, { borderColor: border, backgroundColor: favoritesOnly ? `${tint}18` : card }]}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>Yeu thich</ThemedText>
              </Pressable>
            </View>
            <FlatList
              data={favoritesOnly ? planning.filter((p) => p.isFavorite) : planning}
              keyExtractor={(t) => t.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<ThemedText style={styles.empty}>{t('tripNoActivePlans')}</ThemedText>}
            />
            <ThemedText type="defaultSemiBold">{t('tripHistory')}</ThemedText>
            <FlatList
              data={favoritesOnly ? history.filter((p) => p.isFavorite) : history}
              keyExtractor={(t) => t.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<ThemedText style={styles.empty}>{t('tripNoHistory')}</ThemedText>}
            />
            {favoritesOnly ? (
              <FlatList
                data={favoritePlans}
                keyExtractor={(t) => `fav-${t.id}`}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={<ThemedText type="defaultSemiBold">Yeu thich</ThemedText>}
                ListEmptyComponent={<ThemedText style={styles.empty}>{t('listEmpty')}</ThemedText>}
              />
            ) : null}
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16 },
  list: { gap: 12, paddingBottom: 24 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filterRow: { flexDirection: 'row', marginBottom: 8 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  meta: { fontSize: 13, opacity: 0.8 },
  status: { fontSize: 12, opacity: 0.6 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.7 },
});
