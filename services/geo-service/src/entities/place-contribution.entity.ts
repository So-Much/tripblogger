import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ContributionKind = 'create' | 'edit';
export type ContributionStatus = 'pending' | 'approved' | 'rejected';

@Entity('place_contributions')
export class PlaceContributionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'place_id', type: 'uniqueidentifier', nullable: true })
  placeId!: string | null;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @Column({ type: 'nvarchar', length: 16 })
  kind!: ContributionKind;

  @Column({ name: 'payload_json', type: 'nvarchar', length: 'max' })
  payloadJson!: string;

  @Column({ type: 'nvarchar', length: 16, default: 'pending' })
  status!: ContributionStatus;

  @Column({ name: 'reviewer_note', type: 'nvarchar', length: 500, nullable: true })
  reviewerNote!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
