import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { LocationsModule } from '../locations/locations.module';
import { UsersModule } from '../users/users.module';
import { PostEntity } from '../posts/entities/post.entity';
import { LocationEntity } from '../locations/entities/location.entity';
import { SavedLocationEntity } from './entities/saved-location.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripMemberEntity } from './entities/trip-member.entity';
import { TripPostEntity } from './entities/trip-post.entity';
import { TripRecommendationEntity } from './entities/trip-recommendation.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripEntity } from './entities/trip.entity';
import { RecommendationService } from './recommendation.service';
import { SavedLocationsController } from './saved-locations.controller';
import { SavedLocationsService } from './saved-locations.service';
import { TripAccommodationsService } from './trip-accommodations.service';
import { TripDaysService } from './trip-days.service';
import { TripMembersService } from './trip-members.service';
import { TripPermissionsService } from './trip-permissions.service';
import { TripPostsService } from './trip-posts.service';
import { TripStopsService } from './trip-stops.service';
import { TripsController } from './trips.controller';
import { TripsRealtimeBroadcastService } from './trips-realtime-broadcast.service';
import { TripsRealtimeGateway } from './trips.realtime.gateway';
import { TripsService } from './trips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripEntity,
      TripMemberEntity,
      TripDayEntity,
      TripStopEntity,
      TripAccommodationEntity,
      SavedLocationEntity,
      TripPostEntity,
      TripRecommendationEntity,
      PostEntity,
      LocationEntity,
    ]),
    LocationsModule,
    UsersModule,
  ],
  controllers: [TripsController, SavedLocationsController],
  providers: [
    TripsService,
    TripPermissionsService,
    TripMembersService,
    TripDaysService,
    TripStopsService,
    TripAccommodationsService,
    SavedLocationsService,
    TripPostsService,
    RecommendationService,
    TripsRealtimeGateway,
    TripsRealtimeBroadcastService,
    RolesGuard,
    StatusesGuard,
  ],
  exports: [TripsService, RecommendationService],
})
export class TripsModule {}
