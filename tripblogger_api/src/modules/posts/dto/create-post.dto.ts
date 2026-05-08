import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { PostStatus, PostVisibility } from '../entities/post.entity';

export class LocationDto {
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  name?: string;
}

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title!: string;

  @IsString()
  @MinLength(1)
  contentHtml!: string;

  @IsOptional()
  @IsArray()
  media?: Array<{
    type: 'icon' | 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    iconCode?: string;
  }>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: PostVisibility;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: Exclude<PostStatus, 'DELETED'>;
}
