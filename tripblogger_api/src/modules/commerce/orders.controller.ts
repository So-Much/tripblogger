import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { OrdersService } from './orders.service';
import { ShipmentsService } from './shipments.service';
import { PaymentsService } from './payments.service';
import { CheckoutDto, CreateShipmentDto, QueryOrdersDto } from './dto/shopping.dto';

type AuthedRequest = Request & { user: { sub: string } };

@Controller('commerce/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shipmentsService: ShipmentsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  checkout(@Req() req: AuthedRequest, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(req.user.sub, dto);
  }

  @Get('seller')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listSeller(@Req() req: AuthedRequest, @Query() query: QueryOrdersDto) {
    return this.ordersService.listSellerOrders(req.user.sub, query);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listBuyer(@Req() req: AuthedRequest, @Query() query: QueryOrdersDto) {
    return this.ordersService.listBuyerOrders(req.user.sub, query);
  }

  @Post(':id/shipment')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  createShipment(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.createShipment(req.user.sub, id, dto);
  }

  @Get(':id/shipment')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listShipment(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipmentsService.listByOrder(id, req.user.sub);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  cancel(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelOrder(req.user.sub, id);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  confirm(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.confirmOrder(req.user.sub, id);
  }

  @Post(':id/received')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  received(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.confirmReceived(req.user.sub, id);
  }

  @Get(':id/payment')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  async payment(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.ordersService.getOrder(id, req.user.sub);
    const p = await this.paymentsService.findByOrderId(id);
    if (!p) throw new NotFoundException('Payment not found');
    return {
      id: p.id,
      orderId: p.orderId,
      method: p.method,
      status: p.status,
      amount: Number(p.amount),
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  one(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrder(id, req.user.sub);
  }
}
