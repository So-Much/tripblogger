import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('checkins')
export class CheckinEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @Column({ name: 'place_id', type: 'uniqueidentifier' })
  placeId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat!: string | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
