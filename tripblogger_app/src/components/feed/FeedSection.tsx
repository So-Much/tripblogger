import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FeedPost } from '@/src/types/feed';
import { PostCard } from './PostCard';

interface FeedSectionProps {
  posts: FeedPost[];
}

export function FeedSection({ posts }: FeedSectionProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Home Feed</ThemedText>
      <View style={styles.list}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  list: {
    gap: 10,
  },
});
