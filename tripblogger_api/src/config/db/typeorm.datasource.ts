import 'dotenv/config';
import { DataSource } from 'typeorm';
import { RoleEntity } from '../../modules/users/entities/role.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { GuestProfileEntity } from '../../modules/users/entities/guest-profile.entity';
import { MemberProfileEntity } from '../../modules/users/entities/member-profile.entity';
import { StatusCatalogEntity } from '../../modules/users/entities/status-catalog.entity';
import { UserStatusEntity } from '../../modules/users/entities/user-status.entity';
import { RefreshTokenEntity } from '../../modules/auth/entities/refresh-token.entity';

export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT ?? 1433) }),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
  },
  entities: [
    RoleEntity,
    UserEntity,
    GuestProfileEntity,
    MemberProfileEntity,
    StatusCatalogEntity,
    UserStatusEntity,
    RefreshTokenEntity,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
