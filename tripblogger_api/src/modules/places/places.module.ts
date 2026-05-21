import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { UsersModule } from '../users/users.module';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  imports: [UsersModule],
  controllers: [PlacesController],
  providers: [PlacesService, RolesGuard, StatusesGuard],
  exports: [PlacesService],
})
export class PlacesModule {}
