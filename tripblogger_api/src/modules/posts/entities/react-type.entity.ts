import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ReactTypeUseFor = 'POST' | 'COMMENT' | 'BOTH';

@Entity('react_types')
export class ReactTypeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 32 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ name: 'media', type: 'nvarchar', length: 512, nullable: true })
  media!: string | null;

  @Column({ name: 'use_for', length: 32 })
  useFor!: ReactTypeUseFor;
}
