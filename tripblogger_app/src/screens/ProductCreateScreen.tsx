import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import type { CategoryDto } from '@/src/types/commerce';
import { Image } from 'expo-image';

export function ProductCreateScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productType, setProductType] = useState<'NEW' | 'SECONDHAND'>('NEW');
  const [media, setMedia] = useState<{ type: 'image'; url: string; thumbnailUrl?: string; previewUrl?: string; originalUrl?: string }[]>([]);

  const cats = useQuery({ queryKey: ['commerce', 'categories'], queryFn: () => commerceService.listCategories() });

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
    onError: (e) => Alert.alert('Error', formatApiError(e, 'Failed')),
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
    onError: (e) => Alert.alert('Error', formatApiError(e, 'Failed')),
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
      <ScrollView contentContainerStyle={styles.pad}>
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
        <ThemedText type="subtitle">Stock</ThemedText>
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
        {media[0] ? <Image source={{ uri: media[0].url }} style={styles.prev} /> : null}
        <Pressable
          style={[styles.cta, { backgroundColor: tint }]}
          disabled={create.isPending || !categoryId || !title.trim()}
          onPress={() => create.mutate()}>
          <ThemedText style={styles.ctaTxt}>{t('productSaveDraft')}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.cta, { backgroundColor: '#166534', marginTop: 10 }]}
          disabled={publish.isPending || !categoryId || !title.trim() || !media[0]}
          onPress={() => publish.mutate()}>
          <ThemedText style={styles.ctaTxt}>{t('productPublish')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, gap: 10, paddingBottom: 40 },
  inp: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  ta: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  btn: { padding: 12, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  prev: { width: 120, height: 120, borderRadius: 8 },
  cta: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  ctaTxt: { color: '#fff', fontWeight: '700' },
});
