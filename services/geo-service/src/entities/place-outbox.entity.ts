import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('place_outbox')
@Index(['publishedAt'])
export class PlaceOutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_type', type: 'nvarchar', length: 64 })
  eventType!: string;

  @Column({ name: 'payload_json', type: 'nvarchar', length: 'max' })
  payloadJson!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'published_at', type: 'datetime2', nullable: true })
  publishedAt!: Date | null;
}
