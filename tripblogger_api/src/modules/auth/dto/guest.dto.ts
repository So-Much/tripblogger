import { IsString, MinLength } from 'class-validator';

export class GuestDto {
  @IsString()
  @MinLength(8)
  sessionId!: string;

  @IsString()
  @MinLength(8)
  deviceId!: string;
}

