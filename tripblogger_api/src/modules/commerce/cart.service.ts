import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from './entities/cart.entity';
import { CartProductEntity } from './entities/cart-product.entity';
import { ProductEntity } from './entities/product.entity';
import { CommerceService, CommerceReqMeta } from './commerce.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartProductEntity)
    private readonly lineRepo: Repository<CartProductEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly commerceService: CommerceService,
  ) {}

  async getOrCreateActiveCart(userId: string, reqMeta: CommerceReqMeta) {
    let cart = await this.cartRepo.findOne({
      where: { userId, status: 'ACTIVE' },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.seller', 'items.product.seller.memberProfile'],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId, status: 'ACTIVE' }));
      cart.items = [];
    }
    return this.serializeCart(cart, reqMeta);
  }

  private async serializeCart(cart: CartEntity, reqMeta: CommerceReqMeta) {
    const items = await Promise.all(
      (cart.items ?? []).map(async (line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
        priceSnapshot: Number(line.priceSnapshot),
        product: await this.commerceService.serializeProduct(line.product, reqMeta),
      })),
    );
    const subTotal = items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
    return {
      id: cart.id,
      status: cart.status,
      items,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subTotal,
    };
  }

  async addItem(userId: string, productId: string, qty: number, reqMeta: CommerceReqMeta) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') throw new BadRequestException('Product not available');
    if (product.sellerId === userId) throw new BadRequestException('Cannot add own product');
    if (product.stock < qty) throw new BadRequestException('Insufficient stock');

    let cart = await this.cartRepo.findOne({
      where: { userId, status: 'ACTIVE' },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.seller', 'items.product.seller.memberProfile'],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId, status: 'ACTIVE' }));
      cart.items = [];
    }

    const existing = cart.items?.find((i) => i.productId === productId);
    if (existing) {
      const nextQty = existing.quantity + qty;
      if (product.stock < nextQty) throw new BadRequestException('Insufficient stock');
      existing.quantity = nextQty;
      existing.priceSnapshot = product.price;
      await this.lineRepo.save(existing);
    } else {
      await this.lineRepo.save(
        this.lineRepo.create({
          cartId: cart.id,
          productId,
          quantity: qty,
          priceSnapshot: product.price,
        }),
      );
    }

    const reloaded = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.seller', 'items.product.seller.memberProfile'],
    });
    if (!reloaded) throw new NotFoundException();
    return this.serializeCart(reloaded, reqMeta);
  }

  async updateItem(userId: string, itemId: string, quantity: number, reqMeta: CommerceReqMeta) {
    const line = await this.lineRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'product'],
    });
    if (!line || line.cart.userId !== userId || line.cart.status !== 'ACTIVE') throw new NotFoundException('Cart item not found');
    const cartId = line.cartId;
    if (quantity === 0) {
      await this.lineRepo.remove(line);
    } else {
      if (line.product.status !== 'PUBLISHED') throw new BadRequestException('Product not available');
      if (line.product.stock < quantity) throw new BadRequestException('Insufficient stock');
      line.quantity = quantity;
      line.priceSnapshot = line.product.price;
      await this.lineRepo.save(line);
    }
    const cart = await this.cartRepo.findOne({
      where: { id: cartId, userId, status: 'ACTIVE' },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.seller', 'items.product.seller.memberProfile'],
    });
    if (!cart) throw new NotFoundException();
    return this.serializeCart(cart, reqMeta);
  }

  async removeItem(userId: string, itemId: string, reqMeta: CommerceReqMeta) {
    const line = await this.lineRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });
    if (!line || line.cart.userId !== userId || line.cart.status !== 'ACTIVE') throw new NotFoundException('Cart item not found');
    const cartId = line.cartId;
    await this.lineRepo.remove(line);
    const cart = await this.cartRepo.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.seller', 'items.product.seller.memberProfile'],
    });
    if (!cart) throw new NotFoundException();
    return this.serializeCart(cart, reqMeta);
  }
}
