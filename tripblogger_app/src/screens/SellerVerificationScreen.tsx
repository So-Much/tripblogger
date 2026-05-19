import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useMeQuery } from '@/src/hooks/useAuth';

type VerificationStatus = {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt?: string;
  reviewedAt?: string | null;
} | null;

export function SellerVerificationScreen() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const me = useMeQuery();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  const statusQ = useQuery({
    queryKey: ['commerce', 'seller', 'verification'],
    queryFn: () => commerceService.getVerificationStatus() as Promise<VerificationStatus>,
    enabled: me.data?.role === 'MEMBER',
  });

  const request = useMutation({
    mutationFn: () => commerceService.requestSellerVerification(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'seller', 'verification'] }),
  });

  if (me.data?.role !== 'MEMBER') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  const row = statusQ.data;
  const verified = row?.status === 'APPROVED';

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <View style={styles.pad}>
        <ThemedText type="title">{t('sellerVerificationTitle')}</ThemedText>
        {verified ? (
          <ThemedText style={{ color: muted }}>{t('sellerVerificationApproved')}</ThemedText>
        ) : statusQ.isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText style={{ color: muted }}>
              {t('sellerVerificationStatus')}: {row?.status ?? t('sellerVerificationNone')}
            </ThemedText>
            {row?.status === 'REJECTED' ? (
              <ThemedText style={{ color: muted }}>{t('sellerVerificationRejectedHint')}</ThemedText>
            ) : null}
            {row?.status !== 'PENDING' && row?.status !== 'APPROVED' ? (
              <PressableScale
                style={[styles.cta, { backgroundColor: tint }]}
                disabled={request.isPending}
                onPress={() => request.mutate()}>
                {request.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.ctaTxt}>{t('sellerVerificationRequest')}</ThemedText>
                )}
              </PressableScale>
            ) : null}
            {request.isError ? (
              <ThemedText style={styles.err}>{formatApiError(request.error, '')}</ThemedText>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  pad: { padding: 16, gap: 12 },
  cta: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700' },
  err: { color: '#c00', marginTop: 8 },
});
