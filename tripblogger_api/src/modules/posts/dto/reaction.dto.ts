import { IsUUID } from 'class-validator';

export class ToggleReactionDto {
  @IsUUID()
  typeId!: string;
}
