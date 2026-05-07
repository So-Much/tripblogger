import { IsOptional, IsString, MinLength } from 'class-validator';

export class BanGuestDto {
  @IsString()
  @MinLength(8)
  sessionId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

