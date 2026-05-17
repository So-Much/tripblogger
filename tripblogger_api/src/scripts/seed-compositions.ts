import 'dotenv/config';
import { randomUUID } from 'crypto';
import dataSource from '../config/db/typeorm.datasource';
import { CompositionEntity } from '../modules/compositions/entities/composition.entity';
import { CompositionGuideEntity } from '../modules/compositions/entities/composition-guide.entity';
import { OverlayConfigEntity } from '../modules/compositions/entities/overlay-config.entity';

/** viewBox 0 0 100 100 — keep guides above y=82 (camera control safe zone). */
const OVERLAY = {
  thirds: 'M 33.33 0 L 33.33 82 M 66.66 0 L 66.66 82 M 0 33.33 L 100 33.33 M 0 66.66 L 100 66.66',
  spiralL:
    'M 100 0 C 62 0 38 24 38 50 C 38 62 50 74 62 74 C 70 74 76 68 76 60 C 76 54 72 50 66 50 C 62 50 58 54 58 58 C 58 60 60 62 62 62',
  spiralR:
    'M 0 0 C 38 0 62 24 62 50 C 62 62 50 74 38 74 C 30 74 24 68 24 60 C 24 54 28 50 34 50 C 38 50 42 54 42 58 C 42 60 40 62 38 62',
  diagonal:
    'M 50 8 L 50 74 M 8 50 L 92 50 M 8 8 L 92 74 M 92 8 L 8 74',
  perspective: 'M 50 12 L 8 78 M 50 12 L 92 78 M 20 78 L 80 78',
  portrait: 'M 50 42 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
  postcard: 'M 10 12 L 90 12 L 90 78 L 10 78 Z',
};

const ASPECTS = ['4:3', '16:9', '1:1'] as const;

type SeedComposition = {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  svgPath: string;
  guides: Array<{ stepOrder: number; instruction: string; triggerCondition: string }>;
};

const COMPOSITIONS: SeedComposition[] = [
  {
    id: 'c1111111-1111-4111-8111-111111111101',
    name: 'Tam phân',
    slug: 'rule-of-thirds',
    description: 'Lưới 3×3 — đặt chủ thể tại các điểm giao.',
    thumbnailUrl: null,
    svgPath: OVERLAY.thirds,
    guides: [
      { stepOrder: 1, instruction: 'Giữ máy ổn định', triggerCondition: 'phone_steady' },
      { stepOrder: 2, instruction: 'Căn chủ thể vào điểm giao', triggerCondition: 'face_in_intersection' },
    ],
  },
  {
    id: 'c1111111-1111-4111-8111-111111111102',
    name: 'Vòng xoáy vàng (trái)',
    slug: 'golden-spiral-left',
    description: 'Đường xoắn Fibonacci hướng trái.',
    thumbnailUrl: null,
    svgPath: OVERLAY.spiralL,
    guides: [
      { stepOrder: 1, instruction: 'Giữ máy ngang', triggerCondition: 'level_horizon' },
      { stepOrder: 2, instruction: 'Đặt mắt chủ thể theo xoáy', triggerCondition: 'face_in_intersection' },
    ],
  },
  {
    id: 'c1111111-1111-4111-8111-111111111103',
    name: 'Vòng xoáy vàng (phải)',
    slug: 'golden-spiral-right',
    description: 'Đường xoắn Fibonacci hướng phải.',
    thumbnailUrl: null,
    svgPath: OVERLAY.spiralR,
    guides: [
      { stepOrder: 1, instruction: 'Giữ máy ngang', triggerCondition: 'level_horizon' },
      { stepOrder: 2, instruction: 'Đặt mắt chủ thể theo xoáy', triggerCondition: 'face_in_intersection' },
    ],
  },
  {
    id: 'c1111111-1111-4111-8111-111111111104',
    name: 'Chéo & đối xứng',
    slug: 'diagonal-symmetry',
    description: 'Đường chéo và tâm chữ thập cho kiến trúc.',
    thumbnailUrl: null,
    svgPath: OVERLAY.diagonal,
    guides: [
      { stepOrder: 1, instruction: 'Căn tâm khung hình', triggerCondition: 'phone_steady' },
      { stepOrder: 2, instruction: 'Đối xứng theo đường chéo', triggerCondition: 'manual' },
    ],
  },
  {
    id: 'c1111111-1111-4111-8111-111111111105',
    name: 'Phối cảnh',
    slug: 'perspective-lines',
    description: 'Hai đường hội tụ — chụp đường phố, chiều sâu.',
    thumbnailUrl: null,
    svgPath: OVERLAY.perspective,
    guides: [
      { stepOrder: 1, instruction: 'Căn điểm hội tụ', triggerCondition: 'level_horizon' },
      { stepOrder: 2, instruction: 'Giữ đường chân trời ngang', triggerCondition: 'phone_steady' },
    ],
  },
  {
    id: 'c1111111-1111-4111-8111-111111111106',
    name: 'Chân dung',
    slug: 'centered-portrait',
    description: 'Khung tròn cho chân dung.',
    thumbnailUrl: null,
    svgPath: OVERLAY.portrait,
    guides: [
      { stepOrder: 1, instruction: 'Đặt khuôn mặt trong vòng', triggerCondition: 'face_in_intersection' },
    ],
  },
  {
    id: 'c1111111-1111-4111-8111-111111111107',
    name: 'Bưu thiếp',
    slug: 'postcard',
    description: 'Khung viền cho ảnh kỷ niệm.',
    thumbnailUrl: null,
    svgPath: OVERLAY.postcard,
    guides: [
      { stepOrder: 1, instruction: 'Căn chủ thể trong khung', triggerCondition: 'phone_steady' },
    ],
  },
];

async function run() {
  await dataSource.initialize();
  const compositionsRepo = dataSource.getRepository(CompositionEntity);
  const guidesRepo = dataSource.getRepository(CompositionGuideEntity);
  const overlaysRepo = dataSource.getRepository(OverlayConfigEntity);

  for (const seed of COMPOSITIONS) {
    let composition = await compositionsRepo.findOne({ where: { slug: seed.slug } });
    if (!composition) {
      composition = compositionsRepo.create({
        id: seed.id,
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        thumbnailUrl: seed.thumbnailUrl,
        isActive: true,
      });
      await compositionsRepo.save(composition);
    } else {
      composition.name = seed.name;
      composition.description = seed.description;
      composition.isActive = true;
      await compositionsRepo.save(composition);
    }

    await guidesRepo.delete({ compositionId: composition.id });
    for (const g of seed.guides) {
      await guidesRepo.save(
        guidesRepo.create({
          id: randomUUID(),
          compositionId: composition.id,
          stepOrder: g.stepOrder,
          instruction: g.instruction,
          triggerCondition: g.triggerCondition as CompositionGuideEntity['triggerCondition'],
        }),
      );
    }

    await overlaysRepo.delete({ compositionId: composition.id });
    for (const aspectRatio of ASPECTS) {
      await overlaysRepo.save(
        overlaysRepo.create({
          id: randomUUID(),
          compositionId: composition.id,
          aspectRatio,
          svgPath: seed.svgPath,
        }),
      );
    }
    console.log(`Seeded composition: ${seed.slug}`);
  }

  await dataSource.destroy();
  console.log('Done seeding compositions.');
}

void run().catch((err) => {
  console.error(err);
  process.exit(1);
});
