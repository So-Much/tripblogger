import { IsString, MinLength } from 'class-validator';

export class GuestDto {
  @IsString()
  @MinLength(8)
  sessionId!: string;
}

