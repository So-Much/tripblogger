import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { UsersModule } from '../users/users.module';
import { CompositionGuideEntity } from './entities/composition-guide.entity';
import { CompositionEntity } from './entities/composition.entity';
import { OverlayConfigEntity } from './entities/overlay-config.entity';
import { CompositionsController } from './compositions.controller';
import { CompositionsService } from './compositions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompositionEntity, CompositionGuideEntity, OverlayConfigEntity]),
    UsersModule,
  ],
  controllers: [CompositionsController],
  providers: [CompositionsService, RolesGuard, StatusesGuard],
  exports: [CompositionsService, TypeOrmModule],
})
export class CompositionsModule {}
