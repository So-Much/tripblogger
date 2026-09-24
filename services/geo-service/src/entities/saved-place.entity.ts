import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('saved_places')
export class SavedPlaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @Column({ name: 'place_id', type: 'uniqueidentifier' })
  placeId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
