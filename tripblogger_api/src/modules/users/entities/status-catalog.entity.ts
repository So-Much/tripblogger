import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('status_catalog')
export class StatusCatalogEntity {
  @PrimaryColumn({ name: 'code' })
  code!: string;

  @Column({ name: 'display_name' })
  displayName!: string;
}
