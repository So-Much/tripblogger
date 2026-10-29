import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { KeyboardFormScroll } from '@/src/components/forms/KeyboardFormScroll';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAndroidBack } from '@/src/hooks/useAndroidBack';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { safeRouterBack } from '@/src/utils/safe-router-back';
import type { CategoryDto } from '@/src/types/commerce';
import { Image } from 'expo-image';

export function ProductCreateScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const success = useThemeColor({}, 'success');
  const onCta = useThemeColor({}, 'onCta');
  const primary = useThemeColor({}, 'primary');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productType, setProductType] = useState<'NEW' | 'SECONDHAND'>('NEW');
  const [media, setMedia] = useState<{ type: 'image'; url: string; thumbnailUrl?: string; previewUrl?: string; originalUrl?: string }[]>([]);

  const cats = useQuery({ queryKey: ['commerce', 'categories'], queryFn: () => commerceService.listCategories() });
  const verifyQ = useQuery({
    queryKey: ['commerce', 'seller-verification'],
    queryFn: () => commerceService.getVerificationStatus(),
  });
  const isVerified = verifyQ.data?.status === 'APPROVED';

  const isDirty = useMemo(
    () =>
      Boolean(
        title.trim() ||
          description.trim() ||
          price.trim() ||
          stock.trim() !== '1' ||
          categoryId ||
          media.length,
      ),
    [title, description, price, stock, categoryId, media.length],
  );

  const leaveScreen = useCallback(() => {
    safeRouterBack(router, '/(tabs)/shop/my-products');
  }, [router]);

  const requestClose = useCallback(() => {
    if (!isDirty) {
      leaveScreen();
      return;
    }
    Alert.alert(t('unsavedProfileTitle'), t('unsavedProfileMessage'), [
      { text: t('continueEditingProfile'), style: 'cancel' },
      {
        text: t('discardProfileChanges'),
        style: 'destructive',
        onPress: leaveScreen,
      },
    ]);
  }, [isDirty, leaveScreen, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={requestClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('backHome')}>
          <IconSymbol name="chevron.left" size={24} color={tint} />
        </Pressable>
      ),
    });
  }, [navigation, requestClose, tint, t]);

  useAndroidBack(() => {
    if (isDirty) {
      requestClose();
      return true;
    }
    return false;
  });

  const goVerify = () => router.push('/(tabs)/shop/seller-verify');

  const tryPublish = () => {
    if (!isVerified) {
      Alert.alert(t('sellerVerifyRequiredTitle'), t('sellerVerifyRequiredBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('sellerVerifyCta'), onPress: goVerify },
      ]);
      return;
    }
    publish.mutate();
  };

  const create = useMutation({
    mutationFn: () =>
      commerceService.createProduct({
        title: title.trim(),
        categoryId: categoryId!,
        description: `<p>${description.trim()}</p>`,
        price: parseFloat(price) || 0,
        productType,
        stock: parseInt(stock, 10) || 0,
        media: media.length ? media : undefined,
      }),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      router.replace(`/(tabs)/shop/${p.id}` as Href);
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('locationErrorGeneric'))),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const p = await commerceService.createProduct({
        title: title.trim(),
        categoryId: categoryId!,
        description: `<p>${description.trim()}</p>`,
        price: parseFloat(price) || 0,
        productType,
        stock: parseInt(stock, 10) || 0,
        media: media.length ? media : undefined,
      });
      return commerceService.publishProduct(p.id);
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      router.replace(`/(tabs)/shop/${p.id}` as Href);
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('locationErrorGeneric'))),
  });

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const uploaded = await commerceService.uploadMedia(
      { uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.mimeType ?? 'image/jpeg' },
      'image',
    );
    setMedia([
      {
        type: 'image',
        url: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        previewUrl: uploaded.previewUrl,
        originalUrl: uploaded.originalUrl,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <KeyboardFormScroll contentContainerStyle={styles.pad}>
        <ThemedText type="subtitle">{t('productTitleLabel')}</ThemedText>
        <ThemedTextInput value={title} onChangeText={setTitle} />
        <ThemedText type="subtitle">{t('productDescriptionLabel')}</ThemedText>
        <ThemedTextInput value={description} onChangeText={setDescription} multiline style={styles.ta} />
        <ThemedText type="subtitle">{t('productCategory')}</ThemedText>
        <View style={styles.row}>
          {(cats.data ?? []).map((c: CategoryDto) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[
                styles.chip,
                {
                  borderColor: categoryId === c.id ? tint : border,
                  backgroundColor: categoryId === c.id ? primary : 'transparent',
                },
              ]}>
              <ThemedText>{c.name}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText type="subtitle">{t('productPrice')}</ThemedText>
        <ThemedTextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <ThemedText type="subtitle">{t('productStock')}</ThemedText>
        <ThemedTextInput value={stock} onChangeText={setStock} keyboardType="number-pad" />
        <View style={styles.row}>
          <Pressable
            onPress={() => setProductType('NEW')}
            style={[
              styles.chip,
              {
                borderColor: productType === 'NEW' ? tint : border,
                backgroundColor: productType === 'NEW' ? primary : 'transparent',
              },
            ]}>
            <ThemedText>{t('productNew')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setProductType('SECONDHAND')}
            style={[
              styles.chip,
              {
                borderColor: productType === 'SECONDHAND' ? tint : border,
                backgroundColor: productType === 'SECONDHAND' ? primary : 'transparent',
              },
            ]}>
            <ThemedText>{t('productSecondhand')}</ThemedText>
          </Pressable>
        </View>
        <Pressable onPress={pick} style={[styles.btn, { borderColor: border }]}>
          <ThemedText type="link">{t('productAddPhoto')}</ThemedText>
        </Pressable>
        {media[0] ? <Image source={{ uri: media[0].url }} style={styles.prev} /> : null}
        <Pressable
          style={[styles.cta, { backgroundColor: tint }]}
          disabled={create.isPending || !categoryId || !title.trim()}
          onPress={() => create.mutate()}>
          <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('productSaveDraft')}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.cta, { backgroundColor: success, marginTop: 10 }]}
          disabled={publish.isPending || !categoryId || !title.trim() || !media[0]}
          onPress={tryPublish}>
          <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('productPublish')}</ThemedText>
        </Pressable>
      </KeyboardFormScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, gap: 12, paddingBottom: 40 },
  ta: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, minHeight: 36 },
  btn: { padding: 12, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  prev: { width: 120, height: 120, borderRadius: 12 },
  cta: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, minHeight: 48 },
  ctaTxt: { fontWeight: '700' },
});
