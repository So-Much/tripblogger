import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlaceSource = 'osm' | 'user' | 'seed';
export type PlaceStatus = 'active' | 'pending' | 'rejected';

@Entity('places')
@Index(['status', 'category'])
@Index(['normalizedName'])
@Index(['osmType', 'osmId'])
export class PlaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'osm_type', type: 'nvarchar', length: 8, nullable: true })
  osmType!: string | null;

  @Column({ name: 'osm_id', type: 'bigint', nullable: true })
  osmId!: string | null;

  @Column({ type: 'nvarchar', length: 255 })
  name!: string;

  @Column({ name: 'normalized_name', type: 'nvarchar', length: 255 })
  normalizedName!: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  aliases!: string | null;

  @Column({ type: 'nvarchar', length: 64 })
  category!: string;

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  subcategory!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat!: string;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng!: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  address!: string | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ name: 'opening_hours_raw', type: 'nvarchar', length: 'max', nullable: true })
  openingHoursRaw!: string | null;

  @Column({ name: 'wikidata_id', type: 'nvarchar', length: 32, nullable: true })
  wikidataId!: string | null;

  @Column({ name: 'image_url', type: 'nvarchar', length: 1000, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'description_vi', type: 'nvarchar', length: 'max', nullable: true })
  descriptionVi!: string | null;

  @Column({ name: 'description_en', type: 'nvarchar', length: 'max', nullable: true })
  descriptionEn!: string | null;

  @Column({ type: 'nvarchar', length: 16, default: 'osm' })
  source!: PlaceSource;

  @Column({ type: 'nvarchar', length: 16, default: 'active' })
  status!: PlaceStatus;

  @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAvg!: string;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount!: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  popularity!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'created_by_user_id', type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
