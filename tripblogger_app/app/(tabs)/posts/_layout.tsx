import { Stack } from 'expo-router';
import { useI18n } from '@/src/i18n';

export default function PostsStackLayout() {
  const { t } = useI18n();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('tabPosts') }} />
      <Stack.Screen name="create" options={{ title: t('postsNew') }} />
      <Stack.Screen name="[id]" options={{ title: t('postsDetailTitle') }} />
    </Stack>
  );
}
