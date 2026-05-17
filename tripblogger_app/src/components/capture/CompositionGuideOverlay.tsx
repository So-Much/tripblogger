import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import type { CompositionGuide, CompositionTriggerCondition } from '@/src/types/composition';
import { useI18n } from '@/src/i18n';

type Props = {
  guides: CompositionGuide[];
  activeStepIndex: number;
  steady: boolean;
  level: boolean;
  faceAligned: boolean;
};

function stepSatisfied(
  trigger: CompositionTriggerCondition,
  steady: boolean,
  level: boolean,
  faceAligned: boolean,
): boolean {
  if (trigger === 'phone_steady') return steady;
  if (trigger === 'level_horizon') return level;
  if (trigger === 'face_in_intersection') return faceAligned;
  return false;
}

export function CompositionGuideOverlay({ guides, activeStepIndex, steady, level, faceAligned }: Props) {
  const { t } = useI18n();
  const sorted = [...guides].sort((a, b) => a.stepOrder - b.stepOrder);
  const step = sorted[activeStepIndex] ?? sorted[0];
  if (!step) return null;

  const done = stepSatisfied(step.triggerCondition, steady, level, faceAligned);

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap} pointerEvents="none">
      <View style={[styles.badge, done && styles.badgeDone]}>
        <ThemedText style={styles.stepTxt}>
          {t('compositionGuideStep', { current: activeStepIndex + 1, total: sorted.length })}
        </ThemedText>
        <ThemedText style={styles.instruction}>{step.instruction}</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(22,22,24,0.82)',
    gap: 2,
  },
  badgeDone: {
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.65)',
  },
  stepTxt: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '600' },
  instruction: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
