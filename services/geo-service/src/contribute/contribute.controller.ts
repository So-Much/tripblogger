import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { ContributeService } from './contribute.service';

class CreatePlaceBody {
  @IsString()
  name!: string;
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
  @IsOptional()
  @IsString()
  category?: string;
  @IsOptional()
  @IsString()
  address?: string;
  @IsOptional()
  @IsString()
  openingHours?: string;
  @IsOptional()
  @IsString()
  phone?: string;
  @IsOptional()
  @IsString()
  website?: string;
}

class SuggestionBody {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  address?: string;
  @IsOptional()
  @IsString()
  openingHours?: string;
  @IsOptional()
  @IsString()
  phone?: string;
  @IsOptional()
  @IsString()
  website?: string;
  @IsOptional()
  @IsString()
  category?: string;
}

class ReviewBody {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';
  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('places')
export class ContributeController {
  constructor(
    private readonly contribute: ContributeService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreatePlaceBody) {
    return this.contribute.createPlace(req.user.sub, dto);
  }

  @Post(':id/suggestions')
  @UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  suggest(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuggestionBody,
  ) {
    return this.contribute.suggest(req.user.sub, id, dto);
  }

  @Post('contributions/:id/review')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewBody,
    @Headers('x-admin-secret') secret?: string,
  ) {
    if (secret !== this.config.get('ADMIN_SECRET')) throw new UnauthorizedException();
    return this.contribute.review(id, dto.decision, dto.note);
  }
}
