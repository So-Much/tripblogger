import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { UsersModule } from '../users/users.module';
import { CommentEntity } from './entities/comment.entity';
import { PostEntity } from './entities/post.entity';
import { ReactEntity } from './entities/react.entity';
import { ReactTypeEntity } from './entities/react-type.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, CommentEntity, ReactEntity, ReactTypeEntity]),
    UsersModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, RolesGuard, StatusesGuard],
  exports: [PostsService],
})
export class PostsModule {}
