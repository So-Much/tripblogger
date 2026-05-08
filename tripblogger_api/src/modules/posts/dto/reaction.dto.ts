import { IsString, Matches } from 'class-validator';

export class ToggleReactionDto {
  @IsString()
  @Matches(/^[A-Z_]+$/)
  typeCode!: string;
}
