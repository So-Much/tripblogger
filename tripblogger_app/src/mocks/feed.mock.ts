import { FeedPost } from '@/src/types/feed';

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'p1',
    authorName: 'Linh Travel',
    authorHandle: '@linhtrip',
    location: 'Da Nang',
    caption: 'Morning coffee by the beach. New vlog up now.',
    likes: 1240,
    comments: 164,
    shares: 52,
    createdAtLabel: '2h ago',
  },
  {
    id: 'p2',
    authorName: 'Much Store',
    authorHandle: '@much.shop',
    location: 'Ho Chi Minh City',
    caption: 'Flash sale 11.11 - waterproof phone bag only today.',
    likes: 842,
    comments: 97,
    shares: 35,
    createdAtLabel: '5h ago',
  },
  {
    id: 'p3',
    authorName: 'Thu Foodie',
    authorHandle: '@thu.eats',
    location: 'Ha Noi',
    caption: 'Street food list for rainy day. Save this post.',
    likes: 2360,
    comments: 308,
    shares: 141,
    createdAtLabel: '1d ago',
  },
];
