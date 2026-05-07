import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SectionCard } from '@/src/components/SectionCard';
import { ProfileSummary } from '@/src/types/profile';

interface ProfileSummaryCardProps {
  profile: ProfileSummary;
  statusLine?: string;
}

export function ProfileSummaryCard({ profile, statusLine }: ProfileSummaryCardProps) {
  const muted = useThemeColor({}, 'textMuted');

  return (
    <SectionCard>
      <ThemedText type="subtitle">{profile.displayName}</ThemedText>
      <ThemedText style={{ color: muted }}>{profile.handle}</ThemedText>
      <ThemedText style={styles.bio}>{profile.bio}</ThemedText>
      <View style={styles.statsRow}>
        <ThemedText type="defaultSemiBold">{profile.followers} Followers</ThemedText>
        <ThemedText type="defaultSemiBold">{profile.following} Following</ThemedText>
        <ThemedText type="defaultSemiBold">{profile.posts} Posts</ThemedText>
      </View>
      {statusLine ? <ThemedText style={{ color: muted }}>{statusLine}</ThemedText> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  bio: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 8,
  },
});
