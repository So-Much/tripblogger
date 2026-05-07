import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ProfileSummaryCard } from '@/src/components/profile/ProfileSummaryCard';
import { useAuthStore } from '@/src/store/auth.store';

export function ProfileScreen() {
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const accent = useThemeColor({}, 'accent');
  const surface = useThemeColor({}, 'surface');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const insets = useSafeAreaInsets();

  const profile = me?.profile
    ? {
        displayName: me.profile.username,
        handle: `@${me.profile.username}`,
        followers: '12.4k',
        following: '620',
        posts: '89',
        bio: `${me.profile.email} — thành viên TripBlogger.`,
      }
    : {
        displayName: 'Member',
        handle: '@member',
        followers: '—',
        following: '—',
        posts: '—',
        bio: 'Đang tải hồ sơ…',
      };

  return (
    <ThemedView style={[styles.page, { backgroundColor: surface }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8) + 4,
            paddingBottom: Math.max(insets.bottom, 12) + 16,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: border, backgroundColor: card },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" color={accent} size={24} />
          </Pressable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>
            Hồ sơ
          </ThemedText>
        </View>

        <ProfileSummaryCard
          profile={profile}
          statusLine={`Role: ${me?.role ?? 'MEMBER'} · Trạng thái: ${me?.statuses?.join(', ') || '…'}`}
        />

        <ThemedText style={{ color: muted, fontSize: 14, lineHeight: 20 }}>
          Quản lý đơn hàng, ví, voucher và cài đặt bảo mật sẽ được bổ sung ở các bước tiếp theo.
        </ThemedText>

        <Pressable
          style={[styles.logout, { backgroundColor: accent }]}
          onPress={() => {
            logout();
            router.replace('/');
          }}
        >
          <ThemedText type="defaultSemiBold" style={styles.logoutText}>
            Đăng xuất
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    gap: 14,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 'auto',
    width: 42,
  },
  pressed: {
    opacity: 0.9,
  },
  logout: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 8,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#fff',
  },
});
