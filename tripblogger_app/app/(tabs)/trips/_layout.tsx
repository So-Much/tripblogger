import { Stack } from 'expo-router';

export default function TripsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="my" options={{ title: 'Chuyến đi của bạn' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết chuyến đi' }} />
      <Stack.Screen name="[id]/day/[dayId]" options={{ title: 'Chi tiết ngày' }} />
    </Stack>
  );
}
