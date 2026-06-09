import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'crypto';
import dataSource from '../config/db/typeorm.datasource';
import { REACTION_TYPE_IDS } from '../modules/posts/constants';

/**
 * Seeds PUBLIC published posts with media, comments, and reactions for feed/social testing.
 *
 * Prerequisites: `npm run seed:user`, `npm run seed:buyer-user`
 *
 * Env:
 * - POSTS_SEED_EMAIL (default: minhnhieu50@gmail.com) — author
 * - POSTS_SEED_BUYER_EMAIL (default: buyer@tripblogger.demo) — commenter / reactor
 * - POSTS_SEED_RESET=1 — remove tb-seed-post-* posts and related media/comments/reactions
 */
const DEFAULT_AUTHOR_EMAIL = 'minhnhieu50@gmail.com';
const DEFAULT_BUYER_EMAIL = 'buyer@tripblogger.demo';
const SEED_TAG = 'tb-seed-post';

type PostSeed = {
  id: string;
  title: string;
  contentHtml: string;
  category: string;
  tags: string[];
  location?: { name: string; lat: number; lng: number };
  imageSeed: number;
  comments: Array<{ content: string; replies?: string[] }>;
  reactions: Array<{ typeId: string; user: 'author' | 'buyer' }>;
};

const POSTS: PostSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111201',
    title: 'Sunrise ở Mỹ Khê — buổi sáng đáng thức dậy',
    contentHtml:
      '<p>Bình minh trên bãi biển Mỹ Khê thật yên bình. Gợi ý: dậy sớm 5h30, mang theo áo khoác mỏng vì gió biển hơi lạnh.</p>',
    category: 'Travel',
    tags: [SEED_TAG, 'danang', 'beach', 'sunrise'],
    location: { name: 'Bãi biển Mỹ Khê, Đà Nẵng', lat: 16.0471, lng: 108.2483 },
    imageSeed: 2001,
    comments: [
      { content: 'Ảnh đẹp quá! Mình cũng muốn đi sớm như vậy.', replies: ['Nên book khách sạn gần biển để tiện đi bộ ra bãi nhé.'] },
    ],
    reactions: [
      { typeId: REACTION_TYPE_IDS.HEART, user: 'buyer' },
      { typeId: REACTION_TYPE_IDS.WOW, user: 'author' },
    ],
  },
  {
    id: '11111111-1111-4111-8111-111111111202',
    title: 'Review mì Quảng Bà Mua — đúng vị Đà Nẵng',
    contentHtml:
      '<p>Tô mì vừa đủ, nước dùng đậm đà. Giá hợp lý, quán đông từ 11h trưa. Nên thử thêm bánh tráng cuốn.</p>',
    category: 'Food',
    tags: [SEED_TAG, 'danang', 'food', 'mi-quang'],
    location: { name: 'Mì Quảng Bà Mua, Đà Nẵng', lat: 16.0621, lng: 108.2143 },
    imageSeed: 2002,
    comments: [{ content: 'Mình hay ăn ở đây mỗi lần về Đà Nẵng!' }],
    reactions: [{ typeId: REACTION_TYPE_IDS.HEART, user: 'buyer' }],
  },
  {
    id: '11111111-1111-4111-8111-111111111203',
    title: 'Packing list 3 ngày 2 đêm — chỉ mang đủ dùng',
    contentHtml:
      '<p><strong>Must-have:</strong> packing cubes, adapter, power bank, áo quick-dry, giày đi bộ thoải mái.</p><p>Tránh mang quá nhiều — giặt nhanh buổi tối là đủ.</p>',
    category: 'Tips',
    tags: [SEED_TAG, 'packing', 'tips', 'travel-light'],
    imageSeed: 2003,
    comments: [],
    reactions: [{ typeId: REACTION_TYPE_IDS.WOW, user: 'author' }],
  },
  {
    id: '11111111-1111-4111-8111-111111111204',
    title: 'Cầu Rồng phun lửa cuối tuần — lịch & góc chụp',
    contentHtml:
      '<p>Cầu Rồng thường phun lửa/nước vào tối thứ 7 & Chủ nhật (kiểm tra lịch trước khi đi). Góc chụp đẹp: từ bờ sông Hàn phía Đông.</p>',
    category: 'Travel',
    tags: [SEED_TAG, 'danang', 'dragon-bridge', 'night'],
    location: { name: 'Cầu Rồng, Đà Nẵng', lat: 16.0613, lng: 108.2275 },
    imageSeed: 2004,
    comments: [{ content: 'Tuần trước mình đi đúng 21h, đông nhưng đáng xem!' }],
    reactions: [{ typeId: REACTION_TYPE_IDS.HEART, user: 'buyer' }],
  },
  {
    id: '11111111-1111-4111-8111-111111111205',
    title: 'Hà Nội 48h — phố cổ, cà phê trứng, hồ Hoàn Kiếm',
    contentHtml:
      '<p>Day 1: phố cổ + bún chả. Day 2: Văn Miếu + cà phê Giang + dạo hồ Hoàn Kiếm buổi tối.</p>',
    category: 'Travel',
    tags: [SEED_TAG, 'hanoi', 'city-guide'],
    location: { name: 'Hồ Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8522 },
    imageSeed: 2005,
    comments: [{ content: 'Cà phê Giang ngon, nhưng hơi đông cuối tuần.' }],
    reactions: [{ typeId: REACTION_TYPE_IDS.WOW, user: 'buyer' }],
  },
];

function mediaUrls(seed: number) {
  const base = `https://picsum.photos/seed/tbpost${seed}`;
  return {
    url: `${base}/1080/720`,
    thumbnailUrl: `${base}/360/240`,
    previewUrl: `${base}/720/480`,
    originalUrl: `${base}/1080/720`,
  };
}

async function resolveUserId(email: string, label: string): Promise<string> {
  const rows = (await dataSource.query(
    `SELECT u.id FROM users u INNER JOIN member_profiles mp ON mp.user_id = u.id WHERE mp.email = @0`,
    [email],
  )) as Array<{ id: string }>;
  const userId = rows[0]?.id;
  if (!userId) {
    throw new Error(`No user for ${label} (${email}). Run npm run seed:user / seed:buyer-user first.`);
  }
  return userId;
}

async function resetSeedPosts() {
  const posts = (await dataSource.query(
    `SELECT id FROM posts WHERE tags_json LIKE @0`,
    [`%${SEED_TAG}%`],
  )) as Array<{ id: string }>;

  for (const post of posts) {
    const mediaRows = (await dataSource.query(
      `SELECT media_id FROM post_media WHERE post_id = @0`,
      [post.id],
    )) as Array<{ media_id: string }>;

    await dataSource.query(`DELETE FROM reacts WHERE post_id = @0`, [post.id]);
    await dataSource.query(
      `DELETE FROM reacts WHERE comment_id IN (SELECT id FROM comments WHERE post_id = @0)`,
      [post.id],
    );
    await dataSource.query(`DELETE FROM comments WHERE post_id = @0`, [post.id]);
    await dataSource.query(`DELETE FROM post_media WHERE post_id = @0`, [post.id]);
    await dataSource.query(`DELETE FROM posts WHERE id = @0`, [post.id]);

    for (const row of mediaRows) {
      const stillLinked = (await dataSource.query(
        `SELECT 1 AS x FROM post_media WHERE media_id = @0`,
        [row.media_id],
      )) as Array<{ x: number }>;
      if (stillLinked.length === 0) {
        await dataSource.query(`DELETE FROM media WHERE id = @0`, [row.media_id]);
      }
    }
  }

  console.log(`Reset: removed ${posts.length} seed post(s)`);
}

async function upsertPost(
  seed: PostSeed,
  authorId: string,
  buyerId: string,
  validTypeIds: Set<string>,
): Promise<'inserted' | 'skipped'> {
  const existing = (await dataSource.query(`SELECT id FROM posts WHERE id = @0`, [seed.id])) as Array<{ id: string }>;
  if (existing.length > 0) {
    return 'skipped';
  }

  const seenReactUsers = new Set<string>();
  for (const reaction of seed.reactions) {
    const userId = reaction.user === 'author' ? authorId : buyerId;
    if (seenReactUsers.has(userId)) {
      throw new Error(`Post "${seed.title}" has multiple reactions for the same user (unique index UQ_reacts_post_user).`);
    }
    seenReactUsers.add(userId);
    if (!validTypeIds.has(reaction.typeId.toLowerCase())) {
      throw new Error(`Unknown react type id ${reaction.typeId} for post "${seed.title}". Run migrations first.`);
    }
  }

  const locationJson = seed.location ? JSON.stringify(seed.location) : null;
  const tagsJson = JSON.stringify(seed.tags);

  await dataSource.query(
    `INSERT INTO posts (
      id, user_id, title, content_html, category, tags_json,
      visibility, location_json, status, created_at, updated_at
    ) VALUES (
      @0, @1, @2, @3, @4, @5,
      N'PUBLIC', @6, N'PUBLISHED', DATEADD(day, -@7, SYSUTCDATETIME()), SYSUTCDATETIME()
    )`,
    [seed.id, authorId, seed.title, seed.contentHtml, seed.category, tagsJson, locationJson, seed.imageSeed % 7],
  );

  const urls = mediaUrls(seed.imageSeed);
  const mediaId = randomUUID();
  await dataSource.query(
    `INSERT INTO media (
      id, user_id, type, url, thumbnail_url, preview_url, original_url,
      mime_type, width, height, storage
    ) VALUES (
      @0, @1, N'image', @2, @3, @4, @5,
      N'image/jpeg', 1080, 720, N'local'
    )`,
    [mediaId, authorId, urls.url, urls.thumbnailUrl, urls.previewUrl, urls.originalUrl],
  );
  await dataSource.query(
    `INSERT INTO post_media (id, post_id, media_id, position) VALUES (NEWID(), @0, @1, 0)`,
    [seed.id, mediaId],
  );

  for (const commentSeed of seed.comments) {
    const commentId = randomUUID();
    await dataSource.query(
      `INSERT INTO comments (id, user_id, post_id, content, created_at, updated_at)
       VALUES (@0, @1, @2, @3, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      [commentId, buyerId, seed.id, commentSeed.content],
    );

    for (const reply of commentSeed.replies ?? []) {
      await dataSource.query(
        `INSERT INTO comments (id, user_id, post_id, content, parent_comment_id, created_at, updated_at)
         VALUES (@0, @1, @2, @3, @4, SYSUTCDATETIME(), SYSUTCDATETIME())`,
        [randomUUID(), authorId, seed.id, reply, commentId],
      );
    }
  }

  for (const reaction of seed.reactions) {
    const userId = reaction.user === 'author' ? authorId : buyerId;
    await dataSource.query(
      `INSERT INTO reacts (id, user_id, post_id, comment_id, type_id, created_at)
       VALUES (@0, @1, @2, NULL, @3, SYSUTCDATETIME())`,
      [randomUUID(), userId, seed.id, reaction.typeId],
    );
  }

  return 'inserted';
}

async function main() {
  const reset = process.env.POSTS_SEED_RESET === '1' || process.env.POSTS_SEED_RESET === 'true';
  const authorEmail = process.env.POSTS_SEED_EMAIL ?? DEFAULT_AUTHOR_EMAIL;
  const buyerEmail = process.env.POSTS_SEED_BUYER_EMAIL ?? DEFAULT_BUYER_EMAIL;

  await dataSource.initialize();

  if (reset) {
    await resetSeedPosts();
  }

  const authorId = await resolveUserId(authorEmail, 'author');
  const buyerId = await resolveUserId(buyerEmail, 'buyer');

  const typeRows = (await dataSource.query(`SELECT id FROM react_types`)) as Array<{ id: string }>;
  const validTypeIds = new Set(typeRows.map((r) => r.id.toLowerCase()));

  let inserted = 0;
  let skipped = 0;
  for (const post of POSTS) {
    const result = await upsertPost(post, authorId, buyerId, validTypeIds);
    if (result === 'inserted') {
      inserted += 1;
      console.log(`Seeded post: ${post.title}`);
    } else {
      skipped += 1;
      console.log(`Post already exists: ${post.title}`);
    }
  }

  await dataSource.destroy();
  console.log(`Posts seed done. inserted=${inserted} skipped=${skipped} total=${POSTS.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
