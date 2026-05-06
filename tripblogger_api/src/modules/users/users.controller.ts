import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findByIdOrThrow(id);
    const statuses = await this.usersService.getActiveStatuses(id);
    return {
      id: user.id,
      role: user.role.code,
      statuses,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  async getMyProfile(@Req() req: { user: { sub: string } }) {
    return this.getUser(req.user.sub);
  }
}
