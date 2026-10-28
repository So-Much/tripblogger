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

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'nvarchar', length: 500, nullable: true })
  lastError!: string | null;
}
