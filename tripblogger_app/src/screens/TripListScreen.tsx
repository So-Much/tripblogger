import { useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDto } from '@/src/types/trip';

export function TripListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const query = useQuery({
    queryKey: ['trips', 'mine'],
    queryFn: () => tripsService.listMine({ limit: 50 }),
  });
  const plans = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const planning = useMemo(() => plans.filter((t) => t.status === 'PLANNING' || t.status === 'ACTIVE'), [plans]);
  const history = useMemo(() => plans.filter((t) => t.status === 'COMPLETED' || t.status === 'ARCHIVED' || t.status === 'CANCELLED'), [plans]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push('/(tabs)/trips')} hitSlop={12}>
          <IconSymbol name="plus.circle.fill" size={28} color={tint} />
        </Pressable>
      ),
    });
  }, [navigation, router, tint]);

  const renderItem = ({ item }: { item: TripDto }) => (
    <Pressable
      style={[styles.card, { borderColor: border }]}
      onPress={() => router.push({ pathname: '/(tabs)/trips/[id]', params: { id: item.id } })}>
      <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
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
            <ThemedText type="defaultSemiBold">Plans đang hoạt động</ThemedText>
            <FlatList
              data={planning}
              keyExtractor={(t) => t.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<ThemedText style={styles.empty}>Chưa có plan nào.</ThemedText>}
            />
            <ThemedText type="defaultSemiBold">Lịch sử</ThemedText>
            <FlatList
              data={history}
              keyExtractor={(t) => t.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<ThemedText style={styles.empty}>Chưa có lịch sử.</ThemedText>}
            />
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
  meta: { fontSize: 13, opacity: 0.8 },
  status: { fontSize: 12, opacity: 0.6 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.7 },
});
