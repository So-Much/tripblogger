import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesModule } from '../places/places.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { LocationEntity } from './entities/location.entity';
import { LocationReviewEntity } from './entities/location-review.entity';
import { LocationTypeEntity } from './entities/location-type.entity';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationEntity, LocationTypeEntity, LocationReviewEntity]),
    PlacesModule,
    UsersModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService, RolesGuard, StatusesGuard],
  exports: [LocationsService],
})
export class LocationsModule {}
