import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../modules/users/users.service';
import { REQUIRED_STATUSES_KEY } from '../decorators/statuses.decorator';

@Injectable()
export class StatusesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredStatuses = this.reflector.getAllAndOverride<string[]>(REQUIRED_STATUSES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredStatuses?.length) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub as string | undefined;
    if (!userId) throw new ForbiddenException('User context is missing');

    const activeStatuses = await this.usersService.getActiveStatuses(userId);
    if (!requiredStatuses.every((status) => activeStatuses.includes(status as never))) {
      throw new ForbiddenException('Required statuses are missing');
    }

    if (activeStatuses.includes('BANNED' as never)) {
      throw new ForbiddenException('User is banned');
    }

    return true;
  }
}
