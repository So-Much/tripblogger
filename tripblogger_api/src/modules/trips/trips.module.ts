import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { LocationsModule } from '../locations/locations.module';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { MediaModule } from '../media/media.module';
import { PostEntity } from '../posts/entities/post.entity';
import { LocationEntity } from '../locations/entities/location.entity';
import { MediaEntity } from '../media/entities/media.entity';
import { SavedLocationEntity } from './entities/saved-location.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripMemberEntity } from './entities/trip-member.entity';
import { TripPostEntity } from './entities/trip-post.entity';
import { TripRecommendationEntity } from './entities/trip-recommendation.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripEntity } from './entities/trip.entity';
import { DestinationEntity } from './entities/destination.entity';
import { TripTemplateEntity } from './entities/trip-template.entity';
import { TemplateBlockEntity } from './entities/template-block.entity';
import { EventBlockEntity } from './entities/event-block.entity';
import { TripCheckInEntity } from './entities/trip-check-in.entity';
import { TripCheckInMediaEntity } from './entities/trip-check-in-media.entity';
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
import { DestinationsController } from './destinations.controller';
import { TemplatesController } from './templates.controller';
import { TripsRealtimeBroadcastService } from './trips-realtime-broadcast.service';
import { TripsRealtimeGateway } from './trips.realtime.gateway';
import { TripsService } from './trips.service';
import { DestinationsService } from './destinations.service';
import { TemplatesService } from './templates.service';
import { CookService } from './cook/cook.service';
import { EventBlocksService } from './event-blocks.service';
import { TripCheckInsService } from './trip-check-ins.service';
import { TripAssembleService } from './trip-assemble.service';
import { TemplateCookTripsService } from './template-cook-trips.service';

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
      DestinationEntity,
      TripTemplateEntity,
      TemplateBlockEntity,
      EventBlockEntity,
      TripCheckInEntity,
      TripCheckInMediaEntity,
      PostEntity,
      LocationEntity,
      MediaEntity,
    ]),
    LocationsModule,
    UsersModule,
    PostsModule,
    MediaModule,
  ],
  controllers: [
    TripsController,
    SavedLocationsController,
    DestinationsController,
    TemplatesController,
  ],
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
    DestinationsService,
    TemplatesService,
    CookService,
    EventBlocksService,
    TripCheckInsService,
    TripAssembleService,
    TemplateCookTripsService,
    TripsRealtimeGateway,
    TripsRealtimeBroadcastService,
    RolesGuard,
    StatusesGuard,
  ],
  exports: [TripsService, RecommendationService],
})
export class TripsModule {}
