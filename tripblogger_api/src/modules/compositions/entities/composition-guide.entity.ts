import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompositionEntity } from './composition.entity';

export type CompositionTriggerCondition =
  | 'phone_steady'
  | 'level_horizon'
  | 'face_in_intersection'
  | 'manual';

@Entity('composition_guides')
export class CompositionGuideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'composition_id' })
  compositionId!: string;

  @ManyToOne(() => CompositionEntity, (c) => c.guides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'composition_id' })
  composition!: CompositionEntity;

  @Column({ name: 'step_order', type: 'int' })
  stepOrder!: number;

  @Column({ type: 'nvarchar', length: 512 })
  instruction!: string;

  @Column({ name: 'trigger_condition', length: 64 })
  triggerCondition!: CompositionTriggerCondition;
}
