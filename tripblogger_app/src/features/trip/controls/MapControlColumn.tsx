import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useMapStore } from '../store/map.store';

type FabProps = {
  onRecenter: () => void;
  onResetNorth: () => void;
};

export function MapControlColumn({ onRecenter, onResetNorth }: FabProps) {
  const { t } = useI18n();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const followMode = useMapStore((s) => s.followMode);
  const cycleFollowMode = useMapStore((s) => s.cycleFollowMode);
  const bearing = useMapStore((s) => s.bearing);
  const toggleMapStyle = useMapStore((s) => s.toggleMapStyle);

  const recenterIcon =
    followMode === 'follow-heading'
      ? 'navigation'
      : followMode === 'follow'
        ? 'my-location'
        : 'location-searching';

  return (
    <View style={styles.column} pointerEvents="box-none">
      <Pressable
        onPress={toggleMapStyle}
        style={[styles.fab, { backgroundColor: surface, borderColor: border }]}
        accessibilityLabel={t('mapStyleToggle')}>
        <MaterialIcons name="layers" size={22} color={text} />
      </Pressable>

      {Math.abs(bearing) > 2 ? (
        <Pressable
          onPress={onResetNorth}
          style={[styles.fab, { backgroundColor: surface, borderColor: border }]}
          accessibilityLabel={t('mapCompass')}>
          <MaterialIcons
            name="explore"
            size={22}
            color={text}
            style={{ transform: [{ rotate: `${-bearing}deg` }] }}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          cycleFollowMode();
          onRecenter();
        }}
        style={[styles.fab, { backgroundColor: surface, borderColor: border }]}
        accessibilityLabel={t('mapRecenter')}>
        <MaterialIcons name={recenterIcon} size={22} color={followMode === 'free' ? text : tint} />
        <Text style={[styles.fabLabel, { color: mutedOr(text) }]} numberOfLines={1}>
          {t('mapRecenter')}
        </Text>
      </Pressable>
    </View>
  );
}

function mutedOr(text: string) {
  return text;
}

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    right: 12,
    bottom: 150,
    gap: 10,
    alignItems: 'flex-end',
  },
  fab: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
