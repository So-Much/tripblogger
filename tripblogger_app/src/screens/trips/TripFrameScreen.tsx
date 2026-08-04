import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tripsService } from '@/src/services/api/trips.service';
import type { StayVibe } from '@/src/types/template-cook';
import { formatApiError } from '@/src/utils/format-api-error';
import { addDaysIso, todayIsoDate } from '@/src/utils/template-cook';

const VIBES: { value: StayVibe; label: string }[] = [
  { value: 'GLAMPING', label: 'Glamping' },
  { value: 'CENTRAL', label: 'Trung tâm' },
  { value: 'HOMESTAY', label: 'Homestay' },
];

const NIGHT_OPTIONS = [1, 2, 3, 4, 5];

export function TripFrameScreen() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const text = useThemeColor({}, 'text');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const [startDate, setStartDate] = useState(todayIsoDate());
  const [nightCount, setNightCount] = useState(2);
  const [vibe, setVibe] = useState<StayVibe | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['templates', 'DALAT'],
    queryFn: () => tripsService.listTemplates('DALAT'),
  });

  const endDate = useMemo(() => addDaysIso(startDate, nightCount), [startDate, nightCount]);

  const create = useMutation({
    mutationFn: () =>
      tripsService.createFrame({
        destinationCode: 'DALAT',
        startDate,
        nightCount,
        vibe: vibe ?? undefined,
        templateId: templateId ?? undefined,
        title: title.trim() || undefined,
      }),
    onSuccess: (trip) => {
      router.replace(`/(tabs)/trips/create/pick?tripId=${trip.id}` as Href);
    },
    onError: (e) => Alert.alert('Lỗi', formatApiError(e, 'Không tạo được chuyến đi')),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Khung chuyến đi</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 14 }}>
            Đà Lạt · chọn số đêm, ngày bắt đầu, vibe chỗ ở (tuỳ chọn).
          </ThemedText>

          <View style={[styles.destCard, { borderColor: tint, backgroundColor: `${tint}12` }]}>
            <ThemedText type="defaultSemiBold">Đà Lạt</ThemedText>
            <ThemedText style={{ color: muted, fontSize: 12 }}>Điểm đến mặc định (MVP)</ThemedText>
          </View>

          <ThemedText type="defaultSemiBold">Số đêm</ThemedText>
          <View style={styles.row}>
            {NIGHT_OPTIONS.map((n) => {
              const active = nightCount === n;
              return (
                <PressableScale
                  key={n}
                  style={[
                    styles.chip,
                    active ? { borderColor: tint, backgroundColor: `${tint}18` } : { borderColor: border, backgroundColor: card },
                  ]}
                  onPress={() => setNightCount(n)}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>
                    {n}N{n + 1}Đ
                  </ThemedText>
                </PressableScale>
              );
            })}
          </View>

          <ThemedText type="defaultSemiBold">Ngày bắt đầu (YYYY-MM-DD)</ThemedText>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            autoCapitalize="none"
            placeholder="2026-08-10"
            placeholderTextColor={muted}
            style={[styles.input, { borderColor: border, color: text }]}
          />
          <ThemedText style={{ color: muted, fontSize: 12 }}>Kết thúc ước tính: {endDate}</ThemedText>

          <ThemedText type="defaultSemiBold">Vibe chỗ ở (tuỳ chọn)</ThemedText>
          <View style={styles.row}>
            <PressableScale
              style={[
                styles.chip,
                !vibe ? { borderColor: tint, backgroundColor: `${tint}18` } : { borderColor: border, backgroundColor: card },
              ]}
              onPress={() => setVibe(null)}>
              <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Bỏ qua</ThemedText>
            </PressableScale>
            {VIBES.map((v) => {
              const active = vibe === v.value;
              return (
                <PressableScale
                  key={v.value}
                  style={[
                    styles.chip,
                    active ? { borderColor: tint, backgroundColor: `${tint}18` } : { borderColor: border, backgroundColor: card },
                  ]}
                  onPress={() => setVibe(v.value)}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>{v.label}</ThemedText>
                </PressableScale>
              );
            })}
          </View>

          <ThemedText type="defaultSemiBold">Mẫu lịch (tuỳ chọn)</ThemedText>
          {templatesQuery.isLoading ? (
            <ActivityIndicator color={tint} />
          ) : (
            <View style={{ gap: 8 }}>
              <Pressable
                style={[
                  styles.templateRow,
                  !templateId ? { borderColor: tint, backgroundColor: `${tint}10` } : { borderColor: border },
                ]}
                onPress={() => setTemplateId(null)}>
                <ThemedText type="defaultSemiBold">Không dùng mẫu</ThemedText>
                <ThemedText style={{ color: muted, fontSize: 12 }}>Tự chọn điểm ở bước sau</ThemedText>
              </Pressable>
              {(templatesQuery.data ?? []).map((tpl) => {
                const active = templateId === tpl.id;
                return (
                  <Pressable
                    key={tpl.id}
                    style={[
                      styles.templateRow,
                      active ? { borderColor: tint, backgroundColor: `${tint}10` } : { borderColor: border },
                    ]}
                    onPress={() => {
                      setTemplateId(tpl.id);
                      setNightCount(tpl.nightCount);
                    }}>
                    <ThemedText type="defaultSemiBold">{tpl.title}</ThemedText>
                    <ThemedText style={{ color: muted, fontSize: 12 }}>
                      {tpl.nightCount}N{tpl.nightCount + 1}Đ
                      {tpl.styleTags?.length ? ` · ${tpl.styleTags.join(', ')}` : ''}
                    </ThemedText>
                    {tpl.summary ? (
                      <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={2}>
                        {tpl.summary}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          <ThemedText type="defaultSemiBold">Tiêu đề (tuỳ chọn)</ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Đà Lạt chill cuối tuần"
            placeholderTextColor={muted}
            style={[styles.input, { borderColor: border, color: text }]}
          />
        </ScrollView>

        <PressableScale
          style={[styles.cta, { backgroundColor: cta }]}
          disabled={create.isPending}
          onPress={() => create.mutate()}>
          {create.isPending ? (
            <ActivityIndicator color={onCta} />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: onCta }}>
              Tiếp: Chọn điểm
            </ThemedText>
          )}
        </PressableScale>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 24 },
  destCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  templateRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cta: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
