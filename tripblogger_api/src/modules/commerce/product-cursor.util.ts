import { BadRequestException } from '@nestjs/common';

export interface ProductCursorPayload {
  c: string;
  i: string;
}

export function encodeProductCursor(createdAt: Date, id: string): string {
  const payload: ProductCursorPayload = { c: createdAt.toISOString(), i: id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeProductCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const p = JSON.parse(raw) as ProductCursorPayload;
    if (!p?.c || !p?.i) throw new Error('invalid');
    return { createdAt: new Date(p.c), id: p.i };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}
