import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { UsersModule } from '../users/users.module';
import { CompositionsModule } from '../compositions/compositions.module';
import { CommentEntity } from './entities/comment.entity';
import { MediaEntity } from './entities/media.entity';
import { PostEntity } from './entities/post.entity';
import { ReactEntity } from './entities/react.entity';
import { ReactTypeEntity } from './entities/react-type.entity';
import { PostsController } from './posts.controller';
import { PostsRealtimeGateway } from './posts.realtime.gateway';
import { PostsService } from './posts.service';
import { MediaResolver } from './media.resolver';
import { MediaMigrationWorker } from './media.migration.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, MediaEntity, CommentEntity, ReactEntity, ReactTypeEntity]),
    UsersModule,
    CompositionsModule,
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    PostsRealtimeGateway,
    MediaResolver,
    MediaMigrationWorker,
    RolesGuard,
    StatusesGuard,
  ],
  exports: [PostsService, MediaResolver],
})
export class PostsModule {}
