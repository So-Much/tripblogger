import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';

export function TripDayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const tripId = String(id);
  const dayIdStr = String(dayId);
  const queryClient = useQueryClient();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const [customName, setCustomName] = useState('');

  const dayQuery = useQuery({
    queryKey: ['trips', tripId, 'days', dayIdStr],
    queryFn: () => tripsService.getDay(tripId, dayIdStr),
  });

  const addStop = useMutation({
    mutationFn: async () => {
      const name = customName.trim();
      if (!name) return;
      await tripsService.addStop(tripId, dayIdStr, { customName: name });
    },
    onSuccess: () => {
      setCustomName('');
      void queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
      void queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'days', dayIdStr] });
    },
  });

  const day = dayQuery.data;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {dayQuery.isLoading || !day ? (
        <ActivityIndicator style={styles.loader} color={tint} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title">{day.title ?? `Ngày ${day.dayNumber}`}</ThemedText>
          <ThemedText style={styles.meta}>{day.date}</ThemedText>

          {day.stops.map((s) => (
            <ThemedView key={s.id} style={[styles.stop, { borderColor: border }]}>
              <ThemedText type="defaultSemiBold">
                {s.location?.name ?? s.customName}
              </ThemedText>
              <ThemedText style={styles.meta}>{s.status}</ThemedText>
            </ThemedView>
          ))}

          <ThemedText type="subtitle" style={styles.addTitle}>
            Thêm điểm dừng
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="Tên địa điểm"
            placeholderTextColor="#888"
            value={customName}
            onChangeText={setCustomName}
          />
          <Pressable
            style={[styles.btn, { backgroundColor: tint }]}
            onPress={() => addStop.mutate()}
            disabled={addStop.isPending || !customName.trim()}>
            <ThemedText style={styles.btnText}>Thêm</ThemedText>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 10 },
  loader: { marginTop: 40 },
  meta: { opacity: 0.7, fontSize: 13 },
  stop: { borderWidth: 1, borderRadius: 10, padding: 12 },
  addTitle: { marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  btn: { borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
