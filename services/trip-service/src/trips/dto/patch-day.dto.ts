import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class PatchDayDto {
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string | null;
}
