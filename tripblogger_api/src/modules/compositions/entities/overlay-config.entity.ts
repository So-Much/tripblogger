import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompositionEntity } from './composition.entity';

@Entity('overlay_configs')
export class OverlayConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'composition_id' })
  compositionId!: string;

  @ManyToOne(() => CompositionEntity, (c) => c.overlays, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'composition_id' })
  composition!: CompositionEntity;

  @Column({ name: 'svg_path', type: 'nvarchar', length: 'max' })
  svgPath!: string;

  @Column({ name: 'aspect_ratio', length: 16 })
  aspectRatio!: string;
}
