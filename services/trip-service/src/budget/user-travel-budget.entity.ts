import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_travel_budgets')
export class UserTravelBudgetEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount!: string | null;

  @Column({ type: 'nvarchar', length: 8, nullable: true })
  currency!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
