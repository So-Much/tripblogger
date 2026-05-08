import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadPostMediaDto {
  @IsOptional()
  @IsIn(['image', 'video'])
  kind?: 'image' | 'video';

  @IsOptional()
  @IsString()
  caption?: string;
}

