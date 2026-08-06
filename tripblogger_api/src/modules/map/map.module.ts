import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesModule } from '../places/places.module';
import { UsersModule } from '../users/users.module';
import { LocationEntity } from '../locations/entities/location.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { MapController } from './map.controller';
import { MapService } from './map.service';
import { OverpassProvider } from './providers/overpass.provider';
import { OsrmProvider } from './providers/osrm.provider';

@Module({
  imports: [TypeOrmModule.forFeature([LocationEntity]), PlacesModule, UsersModule],
  controllers: [MapController],
  providers: [MapService, OverpassProvider, OsrmProvider, RolesGuard, StatusesGuard],
  exports: [MapService],
})
export class MapModule {}
