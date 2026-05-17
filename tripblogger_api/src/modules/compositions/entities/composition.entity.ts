import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompositionGuideEntity } from './composition-guide.entity';
import { OverlayConfigEntity } from './overlay-config.entity';

@Entity('compositions')
export class CompositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ length: 64, unique: true })
  slug!: string;

  @Column({ type: 'nvarchar', length: 512, nullable: true })
  description!: string | null;

  @Column({ name: 'thumbnail_url', type: 'nvarchar', length: 512, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => CompositionGuideEntity, (g) => g.composition)
  guides!: CompositionGuideEntity[];

  @OneToMany(() => OverlayConfigEntity, (o) => o.composition)
  overlays!: OverlayConfigEntity[];
}
