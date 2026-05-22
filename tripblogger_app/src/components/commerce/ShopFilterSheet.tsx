import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';

export type ShopSortBy = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export type ShopFilterValues = {
  sortBy: ShopSortBy;
  productType?: 'NEW' | 'SECONDHAND';
};

export function countActiveFilters(f: ShopFilterValues): number {
  let n = 0;
  if (f.sortBy !== 'newest') n += 1;
  if (f.productType) n += 1;
  return n;
}

export function ShopFilterSheet({
  visible,
  draft,
  onChange,
  onClose,
  onApply,
  onReset,
}: {
  visible: boolean;
  draft: ShopFilterValues;
  onChange: (next: ShopFilterValues) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { border, card, cta, text, textMuted, primary, onCta, radius } = useCommerceTheme();

  const sortOptions: ShopSortBy[] = ['newest', 'popular', 'price_asc', 'price_desc'];
  const conditionOptions: { key: 'NEW' | 'SECONDHAND' | undefined; label: string }[] = [
    { key: undefined, label: t('shopFilterAllTypes') },
    { key: 'NEW', label: t('productNew') },
    { key: 'SECONDHAND', label: t('productSecondhand') },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('cancel')} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: card,
            borderColor: border,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: border }]} />
        <View style={styles.sheetHeader}>
          <ThemedText type="subtitle">{t('shopFilterTitle')}</ThemedText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <IconSymbol name="xmark.circle.fill" size={28} color={textMuted} />
          </Pressable>
        </View>

        <ThemedText style={[styles.sectionLabel, { color: textMuted }]}>{t('shopFilterSort')}</ThemedText>
        <View style={styles.optionGrid}>
          {sortOptions.map((s) => {
            const on = draft.sortBy === s;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => onChange({ ...draft, sortBy: s })}
                style={[
                  styles.option,
                  {
                    borderColor: on ? cta : border,
                    backgroundColor: on ? primary : 'transparent',
                    borderRadius: radius.md,
                  },
                ]}>
                <ThemedText style={{ color: on ? cta : text, fontWeight: on ? '700' : '500' }}>
                  {t(`shopSort_${s}`)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText style={[styles.sectionLabel, { color: textMuted }]}>{t('shopFilterCondition')}</ThemedText>
        <View style={styles.optionGrid}>
          {conditionOptions.map((c) => {
            const on = draft.productType === c.key;
            return (
              <Pressable
                key={c.key ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => onChange({ ...draft, productType: c.key })}
                style={[
                  styles.option,
                  {
                    borderColor: on ? cta : border,
                    backgroundColor: on ? primary : 'transparent',
                    borderRadius: radius.md,
                  },
                ]}>
                <ThemedText style={{ color: on ? cta : text, fontWeight: on ? '700' : '500' }}>{c.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={onReset}
            style={[styles.footerBtn, styles.ghost, { borderColor: border, borderRadius: radius.md }]}>
            <ThemedText type="defaultSemiBold">{t('shopFilterReset')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={onApply}
            style={[styles.footerBtn, styles.primary, { backgroundColor: cta, borderRadius: radius.md }]}>
            <ThemedText style={[styles.primaryTxt, { color: onCta }]} type="defaultSemiBold">
              {t('shopFilterApply')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  footerBtn: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ghost: { borderWidth: 1 },
  primary: {},
  primaryTxt: {},
});
