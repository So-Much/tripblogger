import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { resolveLocationTypeVisual, type LocationTypeRef } from '@/src/utils/location-type-display';

type LocationNameLabelProps = {
  name: string;
  locationType?: LocationTypeRef | null;
  variant: 'marker' | 'list' | 'compact' | 'dense';
  selected?: boolean;
  numberOfLines?: number;
  subtitle?: string | null;
};

export function LocationNameLabel({
  name,
  locationType,
  variant,
  selected = false,
  numberOfLines = 2,
  subtitle,
}: LocationNameLabelProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const visual = resolveLocationTypeVisual(locationType);

  const nameStyle = {
    color: visual.color,
    fontWeight: '700' as const,
  };

  if (variant === 'dense' || variant === 'list') {
    return (
      <View style={styles.denseRow}>
        <LocationTypeIcon locationType={locationType} size="sm" selected={selected} />
        <ThemedText numberOfLines={1} style={[styles.denseName, nameStyle]}>
          {name}
        </ThemedText>
        {subtitle ? (
          <ThemedText numberOfLines={1} style={[styles.denseMeta, { color: muted }]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactRow}>
        <View style={[styles.compactAccent, { backgroundColor: visual.color }]} />
        <ThemedText type="defaultSemiBold" numberOfLines={numberOfLines} style={[styles.compactName, nameStyle]}>
          {name}
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.markerBubble,
        {
          backgroundColor: card,
          borderColor: selected ? visual.color : border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}>
      <ThemedText style={[styles.markerName, nameStyle]} numberOfLines={numberOfLines}>
        {name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  compactAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    minWidth: 0,
  },
  denseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    width: '100%',
  },
  denseName: {
    flexShrink: 1,
    fontSize: 14,
    minWidth: 0,
  },
  denseMeta: {
    flexShrink: 0,
    fontSize: 12,
    maxWidth: '42%',
  },
  markerBubble: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 150,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  markerName: {
    fontSize: 11,
    textAlign: 'center',
  },
});
