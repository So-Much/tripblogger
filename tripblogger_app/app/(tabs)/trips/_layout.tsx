import { Stack } from 'expo-router';
import { useI18n } from '@/src/i18n';

export default function TripsStackLayout() {
  const { t } = useI18n();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="my" options={{ title: t('tripSwitcherTitle') }} />
      <Stack.Screen name="create/frame" options={{ title: 'Khung chuyến đi' }} />
      <Stack.Screen name="create/pick" options={{ title: 'Chọn điểm' }} />
      <Stack.Screen name="create/cook" options={{ title: 'Nấu lịch trình' }} />
      <Stack.Screen name="[id]" options={{ title: t('tripDetailTitle') }} />
      <Stack.Screen name="[id]/day/[dayId]" options={{ title: t('tripDayDetailTitle') }} />
    </Stack>
  );
}
