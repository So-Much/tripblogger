import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RoleEntity } from '../../modules/users/entities/role.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { GuestProfileEntity } from '../../modules/users/entities/guest-profile.entity';
import { MemberProfileEntity } from '../../modules/users/entities/member-profile.entity';
import { StatusCatalogEntity } from '../../modules/users/entities/status-catalog.entity';
import { UserStatusEntity } from '../../modules/users/entities/user-status.entity';
import { RefreshTokenEntity } from '../../modules/auth/entities/refresh-token.entity';
import { CommentEntity } from '../../modules/posts/entities/comment.entity';
import { PostEntity } from '../../modules/posts/entities/post.entity';
import { ReactEntity } from '../../modules/posts/entities/react.entity';
import { ReactTypeEntity } from '../../modules/posts/entities/react-type.entity';

export function getTypeOrmConfig(configService: ConfigService): TypeOrmModuleOptions {
  const instanceName = configService.get<string>('DB_INSTANCE');
  const port = configService.get<number>('DB_PORT');

  return {
    type: 'mssql',
    host: configService.getOrThrow<string>('DB_HOST'),
    ...(instanceName ? {} : { port: port ?? 1433 }),
    username: configService.getOrThrow<string>('DB_USERNAME'),
    password: configService.getOrThrow<string>('DB_PASSWORD'),
    database: configService.getOrThrow<string>('DB_NAME'),
    options: { encrypt: false, ...(instanceName ? { instanceName } : {}) },
    entities: [
      RoleEntity,
      UserEntity,
      GuestProfileEntity,
      MemberProfileEntity,
      StatusCatalogEntity,
      UserStatusEntity,
      RefreshTokenEntity,
      PostEntity,
      CommentEntity,
      ReactEntity,
      ReactTypeEntity,
    ],
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
  };
}

export const typeOrmOptionsFactory: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => getTypeOrmConfig(configService),
};
