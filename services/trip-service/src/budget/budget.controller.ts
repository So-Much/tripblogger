import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Repository } from 'typeorm';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { UserTravelBudgetEntity } from './user-travel-budget.entity';

class PutBudgetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number | null;
  @IsOptional()
  @IsString()
  currency?: string;
}

@Controller('trips/budget')
@UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
@Roles('MEMBER')
@RequiredStatuses('ACTIVE')
export class BudgetController {
  constructor(
    @InjectRepository(UserTravelBudgetEntity)
    private readonly repo: Repository<UserTravelBudgetEntity>,
  ) {}

  @Get()
  async get(@Req() req: { user: { sub: string } }) {
    const row = await this.repo.findOne({ where: { userId: req.user.sub } });
    return { amount: row?.amount != null ? Number(row.amount) : null, currency: row?.currency ?? null };
  }

  @Put()
  async put(@Req() req: { user: { sub: string } }, @Body() dto: PutBudgetDto) {
    let row = await this.repo.findOne({ where: { userId: req.user.sub } });
    if (!row) row = this.repo.create({ userId: req.user.sub });
    row.amount = dto.amount != null && dto.amount > 0 ? String(dto.amount) : null;
    row.currency = row.amount ? (dto.currency ?? row.currency ?? 'VND') : null;
    await this.repo.save(row);
    return { amount: row.amount != null ? Number(row.amount) : null, currency: row.currency };
  }
}
