import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';

export function AddressFormScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const isEdit = Boolean(id);

  const existingQ = useQuery({
    queryKey: ['commerce', 'addresses', id],
    queryFn: async () => {
      const list = await commerceService.listAddresses();
      return list.find((a) => a.id === id);
    },
    enabled: isEdit,
  });

  const [label, setLabel] = useState('Nhà');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    const a = existingQ.data;
    if (!a) return;
    setLabel(a.label);
    setRecipientName(a.recipientName);
    setPhone(a.phone);
    setProvince(a.province);
    setDistrict(a.district);
    setWard(a.ward);
    setStreet(a.street);
    setIsDefault(a.isDefault);
  }, [existingQ.data]);

  const save = useMutation({
    mutationFn: () =>
      isEdit && id
        ? commerceService.updateAddress(id, {
            label,
            recipientName,
            phone,
            province,
            district,
            ward,
            street,
            isDefault,
          })
        : commerceService.createAddress({
            label,
            recipientName,
            phone,
            province,
            district,
            ward,
            street,
            isDefault,
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce', 'addresses'] });
      router.back();
    },
    onError: (e) => Alert.alert('Error', formatApiError(e, '')),
  });

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Field label={t('addressLabel')} value={label} onChangeText={setLabel} border={border} text={text} />
        <Field label={t('addressRecipient')} value={recipientName} onChangeText={setRecipientName} border={border} text={text} />
        <Field label={t('addressPhone')} value={phone} onChangeText={setPhone} border={border} text={text} keyboard="phone-pad" />
        <Field label={t('addressProvince')} value={province} onChangeText={setProvince} border={border} text={text} />
        <Field label={t('addressDistrict')} value={district} onChangeText={setDistrict} border={border} text={text} />
        <Field label={t('addressWard')} value={ward} onChangeText={setWard} border={border} text={text} />
        <Field label={t('addressStreet')} value={street} onChangeText={setStreet} border={border} text={text} />
        <ThemedText>{t('addressDefault')}</ThemedText>
        <Switch value={isDefault} onValueChange={setIsDefault} />
        <Pressable style={[styles.cta, { borderColor: border }]} onPress={() => save.mutate()} disabled={save.isPending}>
          <ThemedText type="link">{t('save')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  border,
  text,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  border: string;
  text: string;
  keyboard?: 'phone-pad';
}) {
  return (
    <>
      <ThemedText type="subtitle">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard}
        style={[styles.inp, { borderColor: border, color: text }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, gap: 8, paddingBottom: 40 },
  inp: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16 },
  cta: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', minHeight: 48 },
});
