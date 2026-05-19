import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { UserStatusEntity } from './entities/user-status.entity';
import { RoleEntity } from './entities/role.entity';
import { GuestProfileEntity } from './entities/guest-profile.entity';
import { MemberProfileEntity } from './entities/member-profile.entity';
import { StatusCatalogEntity } from './entities/status-catalog.entity';
import { PostEntity } from '../posts/entities/post.entity';
import { ProductEntity } from '../commerce/entities/product.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserStatusEntity,
      RoleEntity,
      GuestProfileEntity,
      MemberProfileEntity,
      StatusCatalogEntity,
      PostEntity,
      ProductEntity,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard, StatusesGuard],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
