import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { AddressDto } from '@/src/types/commerce';
import { formatApiError } from '@/src/utils/format-api-error';

export function AddressListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMeQuery();
  const border = useThemeColor({}, 'border');

  const q = useQuery({
    queryKey: ['commerce', 'addresses'],
    queryFn: () => commerceService.listAddresses(),
    enabled: me.data?.role === 'MEMBER',
  });

  const del = useMutation({
    mutationFn: (id: string) => commerceService.deleteAddress(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'addresses'] }),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => commerceService.setDefaultAddress(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'addresses'] }),
  });

  if (me.data?.role !== 'MEMBER') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Pressable style={[styles.add, { borderColor: border }]} onPress={() => router.push('/(tabs)/shop/address-form')}>
        <ThemedText type="link">{t('addressNew')}</ThemedText>
      </Pressable>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(a) => a.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        renderItem={({ item }: { item: AddressDto }) => (
          <ThemedView style={[styles.card, { borderColor: border }]}>
            <ThemedText type="defaultSemiBold">
              {item.label} {item.isDefault ? '★' : ''}
            </ThemedText>
            <ThemedText>
              {item.recipientName} · {item.phone}
            </ThemedText>
            <ThemedText style={styles.small}>
              {item.street}, {item.ward}, {item.district}, {item.province}
            </ThemedText>
            <View style={styles.row}>
              {!item.isDefault ? (
                <Pressable onPress={() => setDefault.mutate(item.id)}>
                  <ThemedText type="link">{t('addressSetDefault')}</ThemedText>
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.push(`/(tabs)/shop/address-form?id=${item.id}`)}>
                <ThemedText type="link">{t('productEdit')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert(t('productDelete'), '', [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('productDelete'), style: 'destructive', onPress: () => del.mutate(item.id) },
                  ])
                }>
                <ThemedText type="link" style={{ color: '#b91c1c' }}>
                  {t('productDelete')}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText style={styles.center}>{q.isError ? formatApiError(q.error, '') : '—'}</ThemedText>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: 12 },
  center: { textAlign: 'center', marginTop: 24 },
  add: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, gap: 4 },
  small: { fontSize: 13, opacity: 0.8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
});
