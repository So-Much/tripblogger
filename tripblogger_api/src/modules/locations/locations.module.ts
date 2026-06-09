import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesModule } from '../places/places.module';
import { UsersModule } from '../users/users.module';
import { SavedLocationEntity } from '../trips/entities/saved-location.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { LocationEntity } from './entities/location.entity';
import { LocationMediaEntity } from './entities/location-media.entity';
import { LocationReviewEntity } from './entities/location-review.entity';
import { LocationTypeEntity } from './entities/location-type.entity';
import { UserCheckinEntity } from './entities/user-checkin.entity';
import { CheckinsController } from './checkins.controller';
import { CheckinsService } from './checkins.service';
import { LocationReviewsService } from './location-reviews.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LocationEntity,
      LocationTypeEntity,
      LocationReviewEntity,
      LocationMediaEntity,
      UserCheckinEntity,
      SavedLocationEntity,
    ]),
    PlacesModule,
    UsersModule,
  ],
  controllers: [LocationsController, CheckinsController],
  providers: [LocationsService, LocationReviewsService, CheckinsService, RolesGuard, StatusesGuard],
  exports: [LocationsService, LocationReviewsService, CheckinsService],
})
export class LocationsModule {}
