import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('saved_places')
export class SavedPlaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @Column({ name: 'place_id', type: 'uniqueidentifier' })
  placeId!: string;

  @Column({ name: 'collection_name', type: 'nvarchar', length: 100, default: 'Mặc định' })
  collectionName!: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
