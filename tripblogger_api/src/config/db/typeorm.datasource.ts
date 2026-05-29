import 'dotenv/config';
import { DataSource } from 'typeorm';
import { RoleEntity } from '../../modules/users/entities/role.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { GuestProfileEntity } from '../../modules/users/entities/guest-profile.entity';
import { MemberProfileEntity } from '../../modules/users/entities/member-profile.entity';
import { StatusCatalogEntity } from '../../modules/users/entities/status-catalog.entity';
import { UserStatusEntity } from '../../modules/users/entities/user-status.entity';
import { RefreshTokenEntity } from '../../modules/auth/entities/refresh-token.entity';
import { OAuthIdentityEntity } from '../../modules/auth/entities/oauth-identity.entity';
import { CompositionGuideEntity } from '../../modules/compositions/entities/composition-guide.entity';
import { CompositionEntity } from '../../modules/compositions/entities/composition.entity';
import { OverlayConfigEntity } from '../../modules/compositions/entities/overlay-config.entity';
import { CommentEntity } from '../../modules/posts/entities/comment.entity';
import { MediaEntity } from '../../modules/media/entities/media.entity';
import { PostMediaEntity } from '../../modules/posts/entities/post-media.entity';
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
import { LocationEntity } from '../../modules/locations/entities/location.entity';
import { LocationTypeEntity } from '../../modules/locations/entities/location-type.entity';
import { LocationReviewEntity } from '../../modules/locations/entities/location-review.entity';
import { TripEntity } from '../../modules/trips/entities/trip.entity';
import { TripMemberEntity } from '../../modules/trips/entities/trip-member.entity';
import { TripDayEntity } from '../../modules/trips/entities/trip-day.entity';
import { TripStopEntity } from '../../modules/trips/entities/trip-stop.entity';
import { TripAccommodationEntity } from '../../modules/trips/entities/trip-accommodation.entity';
import { SavedLocationEntity } from '../../modules/trips/entities/saved-location.entity';
import { TripPostEntity } from '../../modules/trips/entities/trip-post.entity';
import { TripRecommendationEntity } from '../../modules/trips/entities/trip-recommendation.entity';

export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT ?? 1433) }),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: true,
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
    OAuthIdentityEntity,
    CompositionEntity,
    CompositionGuideEntity,
    OverlayConfigEntity,
    PostEntity,
    PostMediaEntity,
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
    LocationEntity,
    LocationTypeEntity,
    LocationReviewEntity,
    TripEntity,
    TripMemberEntity,
    TripDayEntity,
    TripStopEntity,
    TripAccommodationEntity,
    SavedLocationEntity,
    TripPostEntity,
    TripRecommendationEntity,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
