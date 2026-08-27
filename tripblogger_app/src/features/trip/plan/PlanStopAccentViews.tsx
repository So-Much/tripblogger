import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import type { PlanStopAccent } from './plan-stop-accents';

type Props = {
  accent: PlanStopAccent;
  label: string;
};

export function PlanStopCornerRibbon({ accent, label }: Props) {
  const isLeft = accent.variant === 'ribbon-tl';
  return (
    <View
      style={[styles.ribbonHost, isLeft ? styles.ribbonHostTl : styles.ribbonHostTr]}
      pointerEvents="none"
      accessibilityLabel={label}>
      <View
        style={[
          styles.ribbonBand,
          { backgroundColor: accent.color },
          isLeft ? styles.ribbonBandTl : styles.ribbonBandTr,
        ]}>
        {accent.icon ? (
          <MaterialIcons name={accent.icon} size={8} color={accent.onColor ?? '#FFF'} />
        ) : null}
        <Text
          style={[styles.ribbonText, { color: accent.onColor ?? '#FFF' }]}
          numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Diagonal banner tucked in the top-right corner (safe zone — away from title/actions). */
export function PlanStopDiagonalBanner({ accent, label }: Props) {
  return (
    <View style={styles.diagonalHost} pointerEvents="none" accessibilityLabel={label}>
      <View style={[styles.diagonalBand, { backgroundColor: accent.color }]}>
        {accent.icon ? (
          <MaterialIcons name={accent.icon} size={9} color={accent.onColor ?? '#FFF'} />
        ) : null}
        <Text
          style={[styles.diagonalText, { color: accent.onColor ?? '#FFF' }]}
          numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export function PlanStopAccentPill({ accent, label }: Props) {
  const color = accent.color;
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}66`,
        },
      ]}
      accessibilityLabel={label}>
      {accent.icon ? <MaterialIcons name={accent.icon} size={10} color={color} /> : null}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbonHost: {
    position: 'absolute',
    zIndex: 3,
    width: 52,
    height: 52,
    overflow: 'hidden',
  },
  ribbonHostTl: {
    top: 0,
    left: 0,
  },
  ribbonHostTr: {
    top: 0,
    right: 0,
  },
  ribbonBand: {
    position: 'absolute',
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  ribbonBandTl: {
    top: 10,
    left: -20,
    transform: [{ rotate: '-45deg' }],
  },
  ribbonBandTr: {
    top: 10,
    right: -20,
    transform: [{ rotate: '45deg' }],
  },
  ribbonText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    maxWidth: 56,
  },
  /** Compact corner — keeps ribbon clear of index, title, and action buttons. */
  diagonalHost: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 3,
    width: 64,
    height: 64,
    overflow: 'hidden',
  },
  diagonalBand: {
    position: 'absolute',
    top: 10,
    right: -28,
    width: 96,
    transform: [{ rotate: '40deg' }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  diagonalText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    maxWidth: 64,
    textAlign: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
});
