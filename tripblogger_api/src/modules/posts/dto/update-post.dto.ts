import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { LocationDto } from './create-post.dto';
import { PostStatus, PostVisibility } from '../entities/post.entity';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contentHtml?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: PostVisibility;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'DELETED'])
  status?: PostStatus;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  category?: string | null;
}
