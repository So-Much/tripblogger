import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import { formatApiError } from '@/src/utils/format-api-error';

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TripCreateScreen() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 2));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      tripsService.create({
        title: title.trim(),
        destinationName: destinationName.trim() || undefined,
        startDate,
        endDate,
      }),
    onSuccess: (trip) => {
      router.replace({ pathname: '/(tabs)/trips/[id]', params: { id: trip.id } });
    },
    onError: (e) => setError(formatApiError(e, 'Không tạo được chuyến đi')),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Tạo chuyến đi</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Tiêu đề"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Điểm đến"
          placeholderTextColor="#888"
          value={destinationName}
          onChangeText={setDestinationName}
        />
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Ngày đi (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput
          style={[styles.input, { borderColor: border, color: text }]}
          placeholder="Ngày về (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
        />
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        <Pressable
          style={[styles.btn, { backgroundColor: tint }]}
          disabled={!title.trim() || mutation.isPending}
          onPress={() => mutation.mutate()}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.btnText}>Tạo</ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c00' },
});
