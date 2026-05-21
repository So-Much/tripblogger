import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CompositionsService } from './compositions.service';

@Controller('compositions')
export class CompositionsController {
  constructor(private readonly compositionsService: CompositionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  list(@Query('active') active?: string) {
    const activeOnly = active !== 'false';
    return this.compositionsService.list(activeOnly);
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  findBySlug(@Param('slug') slug: string) {
    return this.compositionsService.findBySlug(slug);
  }
}
