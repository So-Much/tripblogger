import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('location_types')
export class LocationTypeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ length: 64, unique: true })
  code!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'nvarchar', length: 16, nullable: true })
  icon!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
