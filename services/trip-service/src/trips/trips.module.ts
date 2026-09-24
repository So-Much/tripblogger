import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripStopTagEntity } from './entities/trip-stop-tag.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripEntity } from './entities/trip.entity';
import { TravelLegsService } from './travel-legs.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { GeoRoutingClient } from '../legs/geo-routing.client';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RolesGuard } from '../auth/claim-statuses.guard';
import { BudgetController } from '../budget/budget.controller';
import { UserTravelBudgetEntity } from '../budget/user-travel-budget.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripEntity,
      TripDayEntity,
      TripStopEntity,
      TripStopTagEntity,
      UserTravelBudgetEntity,
    ]),
  ],
  controllers: [TripsController, BudgetController],
  providers: [TripsService, TravelLegsService, GeoRoutingClient, JwksAuthGuard, RolesGuard, ClaimStatusesGuard],
  exports: [TripsService],
})
export class TripsModule {}
