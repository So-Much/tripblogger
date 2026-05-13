import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/shopping.dto';

type AuthedRequest = Request & { user: { sub: string } };

@Controller('commerce/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private reqMeta(req: Request) {
    return {
      protocol: req.protocol,
      host: req.headers.host,
      forwardedProto: req.headers['x-forwarded-proto'] as string | undefined,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  getCart(@Req() req: AuthedRequest) {
    return this.cartService.getOrCreateActiveCart(req.user.sub, this.reqMeta(req));
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  add(@Req() req: AuthedRequest, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(req.user.sub, dto.productId, dto.quantity ?? 1, this.reqMeta(req));
  }

  @Patch('items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  patchItem(
    @Req() req: AuthedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.sub, itemId, dto.quantity, this.reqMeta(req));
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  removeItem(@Req() req: AuthedRequest, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.cartService.removeItem(req.user.sub, itemId, this.reqMeta(req));
  }
}
