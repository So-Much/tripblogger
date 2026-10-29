import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/store/auth.store';
import { resolvePublicDisplayName } from '@/src/utils/display-name';

export function HomeQuickComposer() {
  const router = useRouter();
  const { t } = useI18n();
  const me = useAuthStore((s) => s.me);
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  const avatarUrl = me?.profile?.avatarUrl ?? null;
  const displayName = me?.profile
    ? resolvePublicDisplayName(me.profile.displayName, me.profile.username)
    : '';

  const openCreate = () => router.push('/(tabs)/posts/create');

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: card }]}>
      <Pressable
        style={styles.mainRow}
        onPress={openCreate}
        accessibilityRole="button"
        accessibilityLabel={t('homeQuickComposerPlaceholder')}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatarFallback, { borderColor: border, backgroundColor: card }]}>
            <IconSymbol name="person.crop.circle.fill" size={22} color={cta} />
          </View>
        )}
        <ThemedText style={[styles.placeholder, { color: muted }]} numberOfLines={1}>
          {t('homeQuickComposerPlaceholder')}
        </ThemedText>
      </Pressable>
      <View style={[styles.divider, { backgroundColor: border }]} />
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={openCreate} hitSlop={6}>
          <IconSymbol name="camera.fill" size={18} color={cta} />
          <ThemedText style={[styles.actionLabel, { color: muted }]}>Ảnh</ThemedText>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={openCreate} hitSlop={6}>
          <IconSymbol name="location.fill" size={18} color={cta} />
          <ThemedText style={[styles.actionLabel, { color: muted }]}>Check-in</ThemedText>
        </Pressable>
      </View>
      {displayName ? (
        <ThemedText style={[styles.srOnly, { color: muted }]} accessibilityElementsHidden>
          {displayName}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  srOnly: {
    height: 0,
    overflow: 'hidden',
  },
});
