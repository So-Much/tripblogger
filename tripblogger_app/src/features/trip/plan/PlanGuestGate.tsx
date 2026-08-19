import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

/** Matches TripBottomNav bar height above safe-area padding. */
const NAV_BAR_OFFSET = 56;

/** Invite guests to sign in — no trips API calls. */
export function PlanGuestGate() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const bottom = Math.max(insets.bottom, 8) + NAV_BAR_OFFSET;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom }]}>
      <View style={[styles.panel, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.title, { color: text }]}>{t('planGuestGateTitle')}</Text>
        <Text style={[styles.body, { color: muted }]}>{t('planGuestGateBody')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={[styles.cta, { backgroundColor: cta }]}>
          <Text style={[styles.ctaText, { color: onCta }]}>{t('planGuestGateCta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    zIndex: 30,
    elevation: 30,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  panel: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  cta: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
