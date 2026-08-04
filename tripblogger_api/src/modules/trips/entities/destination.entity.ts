import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DestinationStatus = 'ACTIVE' | 'INACTIVE';

@Entity('destinations')
export class DestinationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 32, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 255 })
  name!: string;

  @Column({ name: 'centroid_lat', type: 'decimal', precision: 10, scale: 8 })
  centroidLat!: string;

  @Column({ name: 'centroid_lng', type: 'decimal', precision: 11, scale: 8 })
  centroidLng!: string;

  @Column({ type: 'nvarchar', length: 20, default: 'ACTIVE' })
  status!: DestinationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
