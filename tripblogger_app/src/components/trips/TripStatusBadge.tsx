import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripStatus, TripStopStatus } from '@/src/types/trip';
import { STOP_STATUS_LABELS, TRIP_STATUS_LABELS } from '@/src/utils/trip-display';

type TripStatusBadgeProps =
  | { kind: 'trip'; status: TripStatus }
  | { kind: 'stop'; status: TripStopStatus };

export function TripStatusBadge(props: TripStatusBadgeProps) {
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const muted = useThemeColor({}, 'textMuted');

  const label =
    props.kind === 'trip' ? TRIP_STATUS_LABELS[props.status] : STOP_STATUS_LABELS[props.status];

  const colors = props.kind === 'trip' ? tripStatusColors(props.status, { cta, success, warning, muted, border }) : stopStatusColors(props.status, { cta, success, warning, muted, border });

  return (
    <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <ThemedText style={[styles.text, { color: colors.text }]}>{label}</ThemedText>
    </View>
  );
}

function tripStatusColors(
  status: TripStatus,
  c: { cta: string; success: string; warning: string; muted: string; border: string },
) {
  switch (status) {
    case 'ACTIVE':
      return { text: c.cta, border: `${c.cta}55`, bg: `${c.cta}18` };
    case 'COMPLETED':
      return { text: c.success, border: `${c.success}55`, bg: `${c.success}18` };
    case 'PLANNING':
    case 'DRAFT':
      return { text: c.warning, border: `${c.warning}55`, bg: `${c.warning}14` };
    case 'CANCELLED':
      return { text: '#DC2626', border: '#FECACA', bg: '#FEF2F2' };
    default:
      return { text: c.muted, border: c.border, bg: `${c.muted}12` };
  }
}

function stopStatusColors(
  status: TripStopStatus,
  c: { cta: string; success: string; warning: string; muted: string; border: string },
) {
  switch (status) {
    case 'VISITING':
      return { text: c.cta, border: `${c.cta}55`, bg: `${c.cta}18` };
    case 'VISITED':
      return { text: c.success, border: `${c.success}55`, bg: `${c.success}18` };
    case 'SKIPPED':
      return { text: c.muted, border: c.border, bg: `${c.muted}10` };
    default:
      return { text: c.muted, border: c.border, bg: undefined };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});
