import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { MapModule } from '../map/map.module';
import { UsersModule } from '../users/users.module';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripStopTagEntity } from './entities/trip-stop-tag.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripEntity } from './entities/trip.entity';
import { TravelLegsService } from './travel-legs.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripEntity, TripDayEntity, TripStopEntity, TripStopTagEntity]),
    UsersModule,
    MapModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TravelLegsService, RolesGuard, StatusesGuard],
  exports: [TripsService],
})
export class TripsModule {}
