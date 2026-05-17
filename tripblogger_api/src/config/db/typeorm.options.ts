import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RoleEntity } from '../../modules/users/entities/role.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { GuestProfileEntity } from '../../modules/users/entities/guest-profile.entity';
import { MemberProfileEntity } from '../../modules/users/entities/member-profile.entity';
import { StatusCatalogEntity } from '../../modules/users/entities/status-catalog.entity';
import { UserStatusEntity } from '../../modules/users/entities/user-status.entity';
import { RefreshTokenEntity } from '../../modules/auth/entities/refresh-token.entity';
import { CompositionGuideEntity } from '../../modules/compositions/entities/composition-guide.entity';
import { CompositionEntity } from '../../modules/compositions/entities/composition.entity';
import { OverlayConfigEntity } from '../../modules/compositions/entities/overlay-config.entity';
import { CommentEntity } from '../../modules/posts/entities/comment.entity';
import { MediaEntity } from '../../modules/posts/entities/media.entity';
import { PostEntity } from '../../modules/posts/entities/post.entity';
import { ReactEntity } from '../../modules/posts/entities/react.entity';
import { ReactTypeEntity } from '../../modules/posts/entities/react-type.entity';
import { CategoryEntity } from '../../modules/commerce/entities/category.entity';
import { TagEntity } from '../../modules/commerce/entities/tag.entity';
import { ProductEntity } from '../../modules/commerce/entities/product.entity';
import { ProductTagEntity } from '../../modules/commerce/entities/product-tag.entity';
import { SellerVerificationEntity } from '../../modules/commerce/entities/seller-verification.entity';
import { WishlistEntity } from '../../modules/commerce/entities/wishlist.entity';
import { CartEntity } from '../../modules/commerce/entities/cart.entity';
import { CartProductEntity } from '../../modules/commerce/entities/cart-product.entity';
import { AddressEntity } from '../../modules/commerce/entities/address.entity';
import { CouponEntity } from '../../modules/commerce/entities/coupon.entity';
import { CouponUsageEntity } from '../../modules/commerce/entities/coupon-usage.entity';
import { OrderEntity } from '../../modules/commerce/entities/order.entity';
import { OrderProductEntity } from '../../modules/commerce/entities/order-product.entity';
import { PaymentEntity } from '../../modules/commerce/entities/payment.entity';
import { ShipmentEntity } from '../../modules/commerce/entities/shipment.entity';
import { ProductRatingEntity } from '../../modules/commerce/entities/product-rating.entity';

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
      CompositionEntity,
      CompositionGuideEntity,
      OverlayConfigEntity,
      PostEntity,
      MediaEntity,
      CommentEntity,
      ReactEntity,
      ReactTypeEntity,
      CategoryEntity,
      TagEntity,
      ProductEntity,
      ProductTagEntity,
      SellerVerificationEntity,
      WishlistEntity,
      CartEntity,
      CartProductEntity,
      AddressEntity,
      CouponEntity,
      CouponUsageEntity,
      OrderEntity,
      OrderProductEntity,
      PaymentEntity,
      ShipmentEntity,
      ProductRatingEntity,
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
