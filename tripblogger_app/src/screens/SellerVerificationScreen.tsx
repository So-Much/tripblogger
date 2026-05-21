import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { useMeQuery } from '@/src/hooks/useAuth';

type VerificationRow = {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt?: string;
  reviewedAt?: string | null;
} | null;

export function SellerVerificationScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMeQuery();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');

  const statusQ = useQuery({
    queryKey: ['commerce', 'seller-verification'],
    queryFn: () => commerceService.getVerificationStatus() as Promise<VerificationRow>,
    enabled: me.data?.role === 'MEMBER',
  });

  const request = useMutation({
    mutationFn: () => commerceService.requestSellerVerification(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce', 'seller-verification'] });
      Alert.alert(t('sellerVerifySubmittedTitle'), t('sellerVerifySubmittedBody'));
    },
    onError: (e) => Alert.alert('', formatApiError(e, '')),
  });

  if (me.data?.role !== 'MEMBER') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  const status = statusQ.data?.status;

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ThemedView style={[styles.card, { borderColor: border, backgroundColor: card }]}>
        {statusQ.isLoading ? (
          <ActivityIndicator />
        ) : status === 'APPROVED' ? (
          <>
            <IconSymbol name="checkmark.seal.fill" size={48} color={tint} />
            <ThemedText type="subtitle">{t('sellerVerifyApprovedTitle')}</ThemedText>
            <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('sellerVerifyApprovedBody')}</ThemedText>
            <Pressable style={[styles.cta, { backgroundColor: tint }]} onPress={() => router.push('/(tabs)/shop/create')}>
              <ThemedText style={styles.ctaTxt}>{t('productCreate')}</ThemedText>
            </Pressable>
          </>
        ) : status === 'PENDING' ? (
          <>
            <IconSymbol name="clock.fill" size={48} color={muted} />
            <ThemedText type="subtitle">{t('sellerVerifyPendingTitle')}</ThemedText>
            <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('sellerVerifyPendingBody')}</ThemedText>
          </>
        ) : status === 'REJECTED' ? (
          <>
            <IconSymbol name="xmark.circle.fill" size={48} color="#b91c1c" />
            <ThemedText type="subtitle">{t('sellerVerifyRejectedTitle')}</ThemedText>
            <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('sellerVerifyRejectedBody')}</ThemedText>
            <Pressable
              style={[styles.cta, { backgroundColor: tint }]}
              disabled={request.isPending}
              onPress={() => request.mutate()}>
              <ThemedText style={styles.ctaTxt}>{t('sellerVerifyRetry')}</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <IconSymbol name="storefront.fill" size={48} color={tint} />
            <ThemedText type="subtitle">{t('sellerVerifyIntroTitle')}</ThemedText>
            <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('sellerVerifyIntroBody')}</ThemedText>
            <Pressable
              style={[styles.cta, { backgroundColor: tint }]}
              disabled={request.isPending}
              onPress={() => request.mutate()}>
              <ThemedText style={styles.ctaTxt}>{t('sellerVerifyCta')}</ThemedText>
            </Pressable>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  cta: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, width: '100%', alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700' },
});
