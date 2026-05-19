import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SectionCard } from '@/src/components/SectionCard';
import { useI18n } from '@/src/i18n';
import { ProfileSummary } from '@/src/types/profile';

interface ProfileSummaryCardProps {
  profile: ProfileSummary;
  statusLine?: string;
}

export function ProfileSummaryCard({ profile, statusLine }: ProfileSummaryCardProps) {
  const { t } = useI18n();
  const muted = useThemeColor({}, 'textMuted');

  return (
    <SectionCard>
      <ThemedText type="subtitle">{profile.displayName}</ThemedText>
      {profile.handle ? <ThemedText style={{ color: muted }}>{profile.handle}</ThemedText> : null}
      <ThemedText style={styles.bio}>{profile.bio}</ThemedText>
      {profile.postsCount != null || profile.productsCount != null ? (
        <View style={styles.statsRow}>
          {profile.postsCount != null ? (
            <ThemedText type="defaultSemiBold">{t('profilePostsCount', { count: profile.postsCount })}</ThemedText>
          ) : null}
          {profile.productsCount != null ? (
            <ThemedText type="defaultSemiBold">{t('profileProductsCount', { count: profile.productsCount })}</ThemedText>
          ) : null}
        </View>
      ) : null}
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
