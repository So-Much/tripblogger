import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('place_reviews')
@Index(['placeId'])
export class PlaceReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'place_id', type: 'uniqueidentifier' })
  placeId!: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  body!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
