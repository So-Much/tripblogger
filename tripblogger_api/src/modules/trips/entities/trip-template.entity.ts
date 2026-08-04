import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DestinationEntity } from './destination.entity';
import { TemplateBlockEntity } from './template-block.entity';

@Entity('trip_templates')
export class TripTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'destination_id' })
  destinationId!: string;

  @ManyToOne(() => DestinationEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'destination_id' })
  destination!: DestinationEntity;

  @Column({ type: 'nvarchar', length: 255 })
  title!: string;

  @Column({ name: 'night_count', type: 'int' })
  nightCount!: number;

  /** JSON string array, e.g. ["chill","foodie"] */
  @Column({ name: 'style_tags', type: 'nvarchar', length: 'max', nullable: true })
  styleTags!: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  summary!: string | null;

  @Column({ name: 'is_published', default: false })
  isPublished!: boolean;

  @OneToMany(() => TemplateBlockEntity, (b) => b.template)
  blocks!: TemplateBlockEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
