import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Sets `req.user` when a valid Bearer JWT is present; otherwise continues without user. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return true;
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      return true;
    }
  }
}
