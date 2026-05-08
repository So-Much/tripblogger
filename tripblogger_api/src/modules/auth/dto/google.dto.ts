import { IsString, MinLength } from 'class-validator';

export class GoogleDto {
  @IsString()
  @MinLength(10)
  idToken!: string;

  @IsString()
  @MinLength(8)
  deviceId!: string;
}

