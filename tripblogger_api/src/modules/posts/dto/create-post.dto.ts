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

  @IsOptional()
  @IsString()
  @MaxLength(64)
  locationId?: string;
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
    mediaId?: string;
    type: 'icon' | 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    originalUrl?: string;
    placeholder?: string;
    width?: number;
    height?: number;
    mimeType?: string;
    storage?: 'local' | 'cloud';
    sourcePath?: string;
    compositionId?: string;
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
