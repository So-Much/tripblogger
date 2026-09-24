import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRED_STATUSES_KEY = 'required_statuses';
export const ROLES_KEY = 'roles';
export const RequiredStatuses = (...statuses: string[]) => SetMetadata(REQUIRED_STATUSES_KEY, statuses);
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class ClaimStatusesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_STATUSES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const statuses = (context.switchToHttp().getRequest().user?.statuses ?? []) as string[];
    if (statuses.includes('BANNED')) throw new ForbiddenException('User is banned');
    if (!required.every((s) => statuses.includes(s))) throw new ForbiddenException('Required statuses are missing');
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const role = context.switchToHttp().getRequest().user?.role as string | undefined;
    if (!role || !required.includes(role)) throw new ForbiddenException('Role is not allowed');
    return true;
  }
}
