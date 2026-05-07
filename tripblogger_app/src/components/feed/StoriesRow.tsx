import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FeedStory } from '@/src/types/story';

interface StoriesRowProps {
  stories: FeedStory[];
}

export function StoriesRow({ stories }: StoriesRowProps) {
  const accent = useThemeColor({}, 'accent');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {stories.map((story, index) => {
        const isFirst = index === 0;
        return (
          <Pressable
            key={story.id}
            style={({ pressed }) => [styles.storyTap, pressed && styles.storyTapPressed]}
            hitSlop={8}
          >
            <View
              style={[
                styles.ring,
                { borderColor: isFirst ? accent : border },
                isFirst ? { shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 } : undefined,
              ]}>
              <View style={[styles.avatar, { backgroundColor: card }]}>
                <ThemedText type="defaultSemiBold" style={{ color: accent, letterSpacing: isFirst ? 0 : -0.5 }}>
                  {story.initials}
                </ThemedText>
              </View>
            </View>
            <ThemedText
              style={[styles.label, { color: isFirst ? text : muted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {story.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 4,
  },
  storyTap: {
    alignItems: 'center',
    width: 74,
    gap: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storyTapPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  label: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    width: '100%',
  },
});
