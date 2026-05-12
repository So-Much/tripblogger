import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { CommerceProductsController } from './commerce-products.controller';
import { CommerceProductRatingsController } from './commerce-product-ratings.controller';
import { CommerceTagsController } from './commerce-tags.controller';
import { CommerceCategoriesController } from './commerce-categories.controller';
import { CommerceSellerController } from './commerce-seller.controller';
import { CommerceService } from './commerce.service';
import { TagsService } from './tags.service';
import { CategoriesService } from './categories.service';
import { SellerVerificationService } from './seller-verification.service';
import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductTagEntity } from './entities/product-tag.entity';
import { SellerVerificationEntity } from './entities/seller-verification.entity';
import { WishlistEntity } from './entities/wishlist.entity';
import { CartEntity } from './entities/cart.entity';
import { CartProductEntity } from './entities/cart-product.entity';
import { AddressEntity } from './entities/address.entity';
import { CouponEntity } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderProductEntity } from './entities/order-product.entity';
import { PaymentEntity } from './entities/payment.entity';
import { ShipmentEntity } from './entities/shipment.entity';
import { ProductRatingEntity } from './entities/product-rating.entity';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { CouponsService } from './coupons.service';
import { CouponsPublicController } from './coupons-public.controller';
import { CouponsAdminController } from './coupons-admin.controller';
import { PaymentsService } from './payments.service';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      CategoryEntity,
      TagEntity,
      ProductTagEntity,
      SellerVerificationEntity,
      MemberProfileEntity,
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
    ]),
    UsersModule,
    PostsModule,
  ],
  controllers: [
    CommerceProductRatingsController,
    CommerceProductsController,
    CommerceTagsController,
    CommerceCategoriesController,
    CommerceSellerController,
    WishlistController,
    CartController,
    AddressesController,
    CouponsPublicController,
    CouponsAdminController,
    OrdersController,
    ShipmentsController,
  ],
  providers: [
    CommerceService,
    TagsService,
    CategoriesService,
    SellerVerificationService,
    WishlistService,
    CartService,
    AddressesService,
    CouponsService,
    PaymentsService,
    OrdersService,
    ShipmentsService,
    RatingsService,
    RolesGuard,
    StatusesGuard,
  ],
  exports: [OrdersService, PaymentsService],
})
export class CommerceModule {}
