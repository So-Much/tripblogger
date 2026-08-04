import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LocationEntity } from '../../locations/entities/location.entity';
import { TripTemplateEntity } from './trip-template.entity';

@Entity('template_blocks')
export class TemplateBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id' })
  templateId!: string;

  @ManyToOne(() => TripTemplateEntity, (t) => t.blocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: TripTemplateEntity;

  @Column({ name: 'location_id' })
  locationId!: string;

  @ManyToOne(() => LocationEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity;

  @Column({ name: 'suggested_day_hint', type: 'int', nullable: true })
  suggestedDayHint!: number | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
