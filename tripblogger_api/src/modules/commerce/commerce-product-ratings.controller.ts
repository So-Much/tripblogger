import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, QueryRatingsDto } from './dto/shopping.dto';

type AuthedRequest = Request & { user: { sub: string } };

@Controller('commerce/products')
export class CommerceProductRatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get(':id/ratings/summary')
  @UseGuards(OptionalJwtAuthGuard)
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratingsService.summary(id);
  }

  @Get(':id/ratings')
  @UseGuards(OptionalJwtAuthGuard)
  list(@Param('id', ParseUUIDPipe) id: string, @Query() query: QueryRatingsDto) {
    return this.ratingsService.listRatings(id, query);
  }

  @Post(':id/ratings')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateRatingDto) {
    return this.ratingsService.createRating(req.user.sub, id, dto);
  }
}
