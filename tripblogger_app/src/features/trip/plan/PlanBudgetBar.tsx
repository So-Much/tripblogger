import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  formatMoneyInput,
  moneyInputFromAmount,
  parseMoneyInput,
} from '@/src/utils/format-currency';
import { usePatchTripMutation } from '../hooks/useTripMutations';
import type { TripDetailDto, TripSummaryDto } from '../types/plan';
import { budgetProgress, isOverBudget, sumStopCosts } from './plan-budget';
import { collectTripStops, stopCostTotal } from './plan-stop-cost';

type Props = {
  trips: TripSummaryDto[];
  activeTrip: TripSummaryDto;
  tripDetail?: TripDetailDto | null;
};

export function PlanBudgetBar({ trips: _trips, activeTrip, tripDetail }: Props) {
  const { t, language } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const cta = useThemeColor({}, 'cta');
  const surface = useThemeColor({}, 'surface');

  const patchTrip = usePatchTripMutation();

  const tripBudget = activeTrip.budgetAmount;
  const currency = activeTrip.budgetCurrency ?? DEFAULT_CURRENCY;
  const allStops = tripDetail ? collectTripStops(tripDetail) : [];
  const allocated = sumStopCosts(allStops);
  const progress = budgetProgress(allocated, tripBudget);
  const over = isOverBudget(allocated, tripBudget);
  const remaining =
    tripBudget != null && tripBudget > 0 ? Math.max(0, tripBudget - allocated) : null;

  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setDraft(moneyInputFromAmount(tripBudget));
    setEditOpen(true);
  };
  const closeEdit = () => {
    if (!saving) setEditOpen(false);
  };

  const save = async () => {
    const amount = parseMoneyInput(draft);
    setSaving(true);
    try {
      await patchTrip.mutateAsync({
        tripId: activeTrip.id,
        dto: {
          budgetAmount: amount,
          budgetCurrency: amount != null ? DEFAULT_CURRENCY : null,
        },
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const stopsWithCost = allStops.filter((s) => stopCostTotal(s) > 0);

  return (
    <>
      <View style={[styles.wrap, { borderColor: border }]}>
        <Pressable onPress={openEdit} style={styles.row} accessibilityRole="button">
          <MaterialIcons name="payments" size={14} color={tint} />
          <Text style={[styles.label, { color: muted }]}>{t('planBudgetTrip')}</Text>
          <Text style={[styles.value, { color: text }]} numberOfLines={1}>
            {tripBudget != null
              ? formatCurrency(tripBudget, { language, currency })
              : t('planBudgetUnset')}
          </Text>
          <MaterialIcons name="edit" size={13} color={muted} />
        </Pressable>

        {tripBudget != null && tripBudget > 0 ? (
          <View style={styles.progressBlock}>
            <View style={[styles.track, { backgroundColor: border }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: over ? danger : cta,
                  },
                ]}
              />
            </View>
            <Text style={[styles.meta, { color: over ? danger : muted }]}>
              {t('planBudgetAllocated', {
                allocated: formatCurrency(allocated, { language, currency }),
                total: formatCurrency(tripBudget, { language, currency }),
              })}
            </Text>
          </View>
        ) : allocated > 0 ? (
          <Text style={[styles.meta, { color: muted }]}>
            {t('planBudgetAllocatedOnly', {
              allocated: formatCurrency(allocated, { language, currency }),
            })}
          </Text>
        ) : null}

        <Pressable
          onPress={() => setDetailOpen(true)}
          style={styles.detailBtn}
          accessibilityRole="button">
          <MaterialIcons name="receipt-long" size={14} color={tint} />
          <Text style={{ color: tint, fontSize: 11, fontWeight: '600' }}>
            {t('planBudgetDetail')}
          </Text>
        </Pressable>
      </View>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
        <Pressable style={styles.backdrop} onPress={closeEdit}>
          <Pressable
            style={[styles.dialog, { backgroundColor: surface, borderColor: border }]}
            onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.dialogTitle, { color: text }]}>{t('planBudgetTrip')}</Text>
            <Text style={[styles.dialogHint, { color: muted }]}>{t('planBudgetTripHint')}</Text>
            <TextInput
              value={draft}
              onChangeText={(v) => setDraft(formatMoneyInput(v))}
              keyboardType="number-pad"
              placeholder={t('planBudgetPlaceholder')}
              placeholderTextColor={muted}
              style={[styles.input, { color: text, borderColor: border }]}
            />
            <View style={styles.actions}>
              <Pressable onPress={closeEdit} disabled={saving} style={styles.actionBtn}>
                <Text style={{ color: muted }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable onPress={() => void save()} disabled={saving} style={styles.actionBtn}>
                <Text style={{ color: tint, fontWeight: '700' }}>{t('save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={detailOpen} transparent animationType="fade" onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDetailOpen(false)}>
          <Pressable
            style={[styles.detailDialog, { backgroundColor: surface, borderColor: border }]}
            onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.dialogTitle, { color: text }]}>{t('planBudgetDetailTitle')}</Text>
            <ScrollView style={styles.detailScroll} keyboardShouldPersistTaps="handled">
              {stopsWithCost.length === 0 ? (
                <Text style={{ color: muted, fontSize: 13 }}>{t('planBudgetDetailEmpty')}</Text>
              ) : (
                stopsWithCost.map((stop) => (
                  <View key={stop.id} style={[styles.detailRow, { borderColor: border }]}>
                    <Text style={[styles.detailName, { color: text }]} numberOfLines={1}>
                      {stop.name}
                    </Text>
                    <Text style={[styles.detailAmount, { color: text }]}>
                      {formatCurrency(stopCostTotal(stop), {
                        language,
                        currency: stop.estimatedCostCurrency ?? currency,
                      })}
                    </Text>
                    {(stop.costItems ?? []).map((item) => (
                      <Text key={item.id} style={[styles.detailItem, { color: muted }]}>
                        {t('planBudgetDetailLine', {
                          label: item.label,
                          unit: formatCurrency(item.unitAmount, { language, currency }),
                          qty: item.quantity,
                          total: formatCurrency(item.unitAmount * item.quantity, {
                            language,
                            currency,
                          }),
                        })}
                      </Text>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
            <View style={[styles.detailSummary, { borderTopColor: border }]}>
              <Text style={{ color: muted, fontSize: 12 }}>{t('planBudgetDetailSpent')}</Text>
              <Text style={{ color: text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {formatCurrency(allocated, { language, currency })}
              </Text>
              {tripBudget != null && tripBudget > 0 ? (
                <>
                  <Text style={{ color: muted, fontSize: 12, marginTop: 6 }}>
                    {t('planBudgetTrip')}
                  </Text>
                  <Text style={{ color: text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(tripBudget, { language, currency })}
                  </Text>
                  <Text
                    style={{
                      color: over ? danger : cta,
                      fontWeight: '700',
                      marginTop: 6,
                      fontVariant: ['tabular-nums'],
                    }}>
                    {t('planBudgetDetailRemaining', {
                      amount: formatCurrency(remaining ?? 0, { language, currency }),
                    })}
                  </Text>
                </>
              ) : null}
            </View>
            <Pressable onPress={() => setDetailOpen(false)} style={styles.actionBtn}>
              <Text style={{ color: tint, fontWeight: '700', textAlign: 'center' }}>
                {t('close')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  progressBlock: { gap: 4 },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  meta: {
    fontSize: 10,
    fontWeight: '500',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailDialog: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    maxHeight: '80%',
  },
  detailScroll: {
    maxHeight: 280,
  },
  detailRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    gap: 2,
  },
  detailName: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detailItem: {
    fontSize: 11,
    paddingLeft: 8,
  },
  detailSummary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 2,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dialogHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
});
