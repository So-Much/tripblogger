import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  formatMoneyInput,
  moneyInputFromAmount,
  parseMoneyInput,
} from '@/src/utils/format-currency';
import type { StopCostItem } from '../types/plan';
import {
  newStopCostItem,
  normalizeCostItems,
  stopCostItemTotal,
  stopCostTotal,
} from './plan-stop-cost';

type DraftRow = {
  id: string;
  label: string;
  unitText: string;
  qtyText: string;
};

type Props = {
  items: StopCostItem[];
  currency?: string | null;
  disabled?: boolean;
  onChange: (items: StopCostItem[]) => void;
  onFieldFocus?: () => void;
};

function toDraft(items: StopCostItem[]): DraftRow[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    unitText: moneyInputFromAmount(item.unitAmount || null),
    qtyText: String(item.quantity),
  }));
}

function fromDraft(rows: DraftRow[]): StopCostItem[] {
  return normalizeCostItems(
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      unitAmount: parseMoneyInput(row.unitText) ?? 0,
      quantity: (() => {
        const n = parseInt(row.qtyText.replace(/\D/g, ''), 10);
        return Number.isFinite(n) && n > 0 ? n : 1;
      })(),
    })),
  );
}

/**
 * Local-draft cost line editor. Commits only when focus leaves the editor
 * (not when hopping between fields), so typing UX stays smooth.
 */
export function PlanStopCostEditor({ items, currency, disabled, onChange, onFieldFocus }: Props) {
  const { t, language } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const background = useThemeColor({}, 'background');

  const [draft, setDraft] = useState<DraftRow[]>(() => toDraft(items));
  const focusedCount = useRef(0);
  const dirty = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const cur = currency ?? DEFAULT_CURRENCY;

  useEffect(() => {
    if (dirty.current || focusedCount.current > 0) return;
    setDraft(toDraft(items));
  }, [items]);

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    dirty.current = true;
    setDraft((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const commitIfIdle = () => {
    setTimeout(() => {
      if (focusedCount.current > 0) return;
      const next = fromDraft(draftRef.current);
      dirty.current = false;
      // Clamp empty qty displays after commit
      setDraft((prev) =>
        prev.map((row) => {
          const qty = parseInt(row.qtyText.replace(/\D/g, ''), 10);
          return {
            ...row,
            qtyText: Number.isFinite(qty) && qty > 0 ? String(qty) : '1',
            unitText: formatMoneyInput(row.unitText) || row.unitText,
          };
        }),
      );
      onChange(next);
    }, 80);
  };

  const onFieldFocusInner = () => {
    focusedCount.current += 1;
    onFieldFocus?.();
  };

  const onFieldBlur = () => {
    focusedCount.current = Math.max(0, focusedCount.current - 1);
    commitIfIdle();
  };

  const removeRow = (id: string) => {
    dirty.current = true;
    setDraft((prev) => {
      const next = prev.filter((row) => row.id !== id);
      draftRef.current = next;
      return next;
    });
    // Force commit after remove
    setTimeout(() => {
      dirty.current = false;
      onChange(fromDraft(draftRef.current));
    }, 0);
  };

  const addRow = () => {
    dirty.current = true;
    const item = newStopCostItem();
    setDraft((prev) => [
      ...prev,
      { id: item.id, label: '', unitText: '', qtyText: '1' },
    ]);
  };

  const previewItems = fromDraft(draft);
  const total = stopCostTotal({ costItems: previewItems, estimatedCostAmount: null });

  return (
    <View style={styles.wrap}>
      {draft.length === 0 ? (
        <Text style={[styles.empty, { color: muted }]}>{t('planStopCostEmpty')}</Text>
      ) : (
        draft.map((row) => {
          const unit = parseMoneyInput(row.unitText) ?? 0;
          const qty = parseInt(row.qtyText.replace(/\D/g, ''), 10);
          const lineTotal = stopCostItemTotal({
            id: row.id,
            label: row.label,
            unitAmount: unit,
            quantity: Number.isFinite(qty) && qty > 0 ? qty : 0,
          });
          return (
            <View key={row.id} style={[styles.row, { borderColor: border }]}>
              <BottomSheetTextInput
                value={row.label}
                onChangeText={(v) => updateRow(row.id, { label: v })}
                onFocus={onFieldFocusInner}
                onBlur={onFieldBlur}
                placeholder={t('planStopCostItemLabel')}
                placeholderTextColor={muted}
                style={[styles.labelInput, { color: text, borderColor: border, backgroundColor: background }]}
                editable={!disabled}
              />
              <View style={styles.metaRow}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>{t('planStopCostUnit')}</Text>
                  <BottomSheetTextInput
                    value={row.unitText}
                    onChangeText={(v) => updateRow(row.id, { unitText: formatMoneyInput(v) })}
                    onFocus={onFieldFocusInner}
                    onBlur={onFieldBlur}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={muted}
                    style={[styles.amountInput, { color: text, borderColor: border, backgroundColor: background }]}
                    editable={!disabled}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>{t('planStopCostQty')}</Text>
                  <BottomSheetTextInput
                    value={row.qtyText}
                    onChangeText={(v) => {
                      // Allow empty while typing; validate on blur/commit.
                      const cleaned = v.replace(/\D/g, '');
                      updateRow(row.id, { qtyText: cleaned });
                    }}
                    onFocus={onFieldFocusInner}
                    onBlur={onFieldBlur}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={muted}
                    style={[styles.qtyInput, { color: text, borderColor: border, backgroundColor: background }]}
                    editable={!disabled}
                  />
                </View>
                <View style={styles.totalCol}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>{t('planStopCostLineTotal')}</Text>
                  <Text style={[styles.lineTotal, { color: text }]}>
                    {formatCurrency(lineTotal, { language, currency: cur })}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planStopCostRemoveItem')}
                  onPress={() => removeRow(row.id)}
                  disabled={disabled}
                  hitSlop={6}
                  style={styles.removeBtn}>
                  <MaterialIcons name="close" size={16} color={danger} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <Pressable
        accessibilityRole="button"
        onPress={addRow}
        disabled={disabled}
        style={[styles.addBtn, { borderColor: tint }]}>
        <MaterialIcons name="add" size={16} color={tint} />
        <Text style={{ color: tint, fontWeight: '600', fontSize: 13 }}>{t('planStopCostAddItem')}</Text>
      </Pressable>

      {total > 0 ? (
        <Text style={[styles.grandTotal, { color: text }]}>
          {t('planStopCostGrandTotal', {
            total: formatCurrency(total, { language, currency: cur }),
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  empty: { fontSize: 12, fontStyle: 'italic' },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 8,
  },
  labelInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  field: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '600' },
  amountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  qtyInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  totalCol: { flex: 1.2, gap: 4 },
  lineTotal: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 8,
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
