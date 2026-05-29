import { Stack } from 'expo-router';

export default function TripsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Chuyến đi' }} />
      <Stack.Screen name="create" options={{ title: 'Tạo chuyến đi' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết' }} />
      <Stack.Screen name="[id]/day/[dayId]" options={{ title: 'Ngày' }} />
    </Stack>
  );
}
