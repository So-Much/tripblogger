import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { UserStatusCode } from '@/src/types/auth';

export type StatusDetail = {
  code: UserStatusCode;
  displayName: string;
};

export function StatusBadges({ statuses }: { statuses: StatusDetail[] }) {
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const muted = useThemeColor({}, 'textMuted');

  if (!statuses.length) return null;

  return (
    <View style={styles.wrap}>
      {statuses.map((s) => (
        <View
          key={s.code}
          style={[
            styles.badge,
            {
              borderColor: s.code === 'BANNED' || s.code === 'SUSPENDED' ? '#EF4444' : border,
              backgroundColor: s.code === 'PREMIUM' || s.code === 'VERIFIED' ? `${cta}14` : undefined,
            },
          ]}>
          <ThemedText style={[styles.txt, { color: muted }]}>{s.displayName}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  txt: { fontSize: 11, fontWeight: '600' },
});
