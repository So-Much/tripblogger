import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAndroidBack } from '@/src/hooks/useAndroidBack';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { safeRouterBack } from '@/src/utils/safe-router-back';
import type { CategoryDto } from '@/src/types/commerce';
import { PressableScale } from '@/src/components/feedback/PressableScale';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

type MediaItem = {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
};

export function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const success = useThemeColor({}, 'success');
  const onCta = useThemeColor({}, 'onCta');

  const productQ = useQuery({
    queryKey: ['commerce', 'product', id],
    queryFn: () => commerceService.getProduct(String(id)),
    enabled: Boolean(id),
  });

  const cats = useQuery({ queryKey: ['commerce', 'categories'], queryFn: () => commerceService.listCategories() });
  const verifyQ = useQuery({
    queryKey: ['commerce', 'seller-verification'],
    queryFn: () => commerceService.getVerificationStatus(),
  });
  const isVerified = verifyQ.data?.status === 'APPROVED';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productType, setProductType] = useState<'NEW' | 'SECONDHAND'>('NEW');
  const [media, setMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!productQ.data) return;
    const p = productQ.data;
    setTitle(p.title);
    setDescription(stripHtml(p.description));
    setPrice(String(p.price));
    setStock(String(p.stock));
    setCategoryId(p.categoryId);
    setProductType(p.productType);
    setMedia(
      (p.media ?? []).map((m) => ({
        type: m.type === 'video' ? 'video' : 'image',
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        previewUrl: m.previewUrl,
        originalUrl: m.originalUrl,
      })),
    );
  }, [productQ.data]);

  const initialSnapshot = useMemo(() => {
    if (!productQ.data) return null;
    const p = productQ.data;
    return {
      title: p.title,
      description: stripHtml(p.description),
      price: String(p.price),
      stock: String(p.stock),
      categoryId: p.categoryId,
      productType: p.productType,
      mediaUrl: p.media?.[0]?.url ?? '',
    };
  }, [productQ.data]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      title.trim() !== initialSnapshot.title.trim() ||
      description.trim() !== initialSnapshot.description.trim() ||
      price.trim() !== initialSnapshot.price.trim() ||
      stock.trim() !== initialSnapshot.stock.trim() ||
      categoryId !== initialSnapshot.categoryId ||
      productType !== initialSnapshot.productType ||
      (media[0]?.url ?? '') !== initialSnapshot.mediaUrl
    );
  }, [initialSnapshot, title, description, price, stock, categoryId, productType, media]);

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

  const save = useMutation({
    mutationFn: () =>
      commerceService.updateProduct(String(id), {
        title: title.trim(),
        categoryId: categoryId!,
        description: `<p>${description.trim()}</p>`,
        price: parseFloat(price) || 0,
        productType,
        stock: parseInt(stock, 10) || 0,
        media: media.length ? media : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      leaveScreen();
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('locationErrorGeneric'))),
  });

  const publish = useMutation({
    mutationFn: async () => {
      await commerceService.updateProduct(String(id), {
        title: title.trim(),
        categoryId: categoryId!,
        description: `<p>${description.trim()}</p>`,
        price: parseFloat(price) || 0,
        productType,
        stock: parseInt(stock, 10) || 0,
        media: media.length ? media : undefined,
      });
      return commerceService.publishProduct(String(id));
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      router.replace(`/(tabs)/shop/${p.id}` as Href);
    },
    onError: (e) => Alert.alert(t('errorTitle'), formatApiError(e, t('locationErrorGeneric'))),
  });

  const remove = useMutation({
    mutationFn: () => commerceService.deleteProduct(String(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      router.replace('/(tabs)/shop/my-products' as Href);
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

  if (!id) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Invalid product</ThemedText>
      </ThemedView>
    );
  }

  if (productQ.isLoading || !productQ.data) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const isDraft = productQ.data.status === 'DRAFT';

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ThemedText type="subtitle">{t('productEdit')}</ThemedText>
        <ThemedText style={styles.status}>{productQ.data.status}</ThemedText>
        <ThemedText type="subtitle">{t('productTitleLabel')}</ThemedText>
        <TextInput value={title} onChangeText={setTitle} style={[styles.inp, { borderColor: border, color: text }]} />
        <ThemedText type="subtitle">{t('productDescriptionLabel')}</ThemedText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.inp, styles.ta, { borderColor: border, color: text }]}
        />
        <ThemedText type="subtitle">{t('productCategory')}</ThemedText>
        <View style={styles.row}>
          {(cats.data ?? []).map((c: CategoryDto) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, { borderColor: categoryId === c.id ? tint : border }]}>
              <ThemedText>{c.name}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText type="subtitle">{t('productPrice')}</ThemedText>
        <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={[styles.inp, { borderColor: border, color: text }]} />
        <ThemedText type="subtitle">{t('productStock')}</ThemedText>
        <TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" style={[styles.inp, { borderColor: border, color: text }]} />
        <View style={styles.row}>
          <Pressable onPress={() => setProductType('NEW')} style={[styles.chip, { borderColor: productType === 'NEW' ? tint : border }]}>
            <ThemedText>{t('productNew')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setProductType('SECONDHAND')}
            style={[styles.chip, { borderColor: productType === 'SECONDHAND' ? tint : border }]}>
            <ThemedText>{t('productSecondhand')}</ThemedText>
          </Pressable>
        </View>
        <Pressable onPress={pick} style={[styles.btn, { borderColor: border }]}>
          <ThemedText type="link">{t('productAddPhoto')}</ThemedText>
        </Pressable>
        {media[0] ? <Image source={{ uri: media[0].previewUrl ?? media[0].url }} style={styles.prev} contentFit="cover" /> : null}
        <PressableScale
          style={[styles.cta, { backgroundColor: tint }]}
          disabled={save.isPending || !categoryId || !title.trim()}
          onPress={() => save.mutate()}>
          {save.isPending ? (
            <ActivityIndicator color={onCta} />
          ) : (
            <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('save')}</ThemedText>
          )}
        </PressableScale>
        {isDraft ? (
          <PressableScale
            style={[styles.cta, { backgroundColor: success, marginTop: 10 }]}
            disabled={publish.isPending || !categoryId || !title.trim() || !media[0]}
            onPress={tryPublish}>
            <ThemedText style={[styles.ctaTxt, { color: onCta }]}>{t('productPublish')}</ThemedText>
          </PressableScale>
        ) : null}
        <PressableScale
          style={[styles.cta, styles.danger, { marginTop: 10 }]}
          disabled={remove.isPending}
          onPress={() =>
            Alert.alert(t('productDeleteConfirmTitle'), t('productDeleteConfirmBody'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('postDeleteAction'), style: 'destructive', onPress: () => remove.mutate() },
            ])
          }>
          <ThemedText style={styles.dangerTxt}>{t('productDelete')}</ThemedText>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: 16, gap: 10, paddingBottom: 40 },
  status: { fontSize: 12, opacity: 0.7 },
  inp: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  ta: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  btn: { padding: 12, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  prev: { width: 120, height: 120, borderRadius: 8 },
  cta: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, minHeight: 48 },
  ctaTxt: { fontWeight: '700' },
  danger: { borderWidth: 1, borderColor: '#EF4444', backgroundColor: 'transparent' },
  dangerTxt: { color: '#EF4444', fontWeight: '700' },
});
