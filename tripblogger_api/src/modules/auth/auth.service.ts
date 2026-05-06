import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RoleEntity } from '../users/entities/role.entity';
import { RoleCode } from '../users/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly rolesRepo: Repository<RoleEntity>,
    @InjectRepository(MemberProfileEntity) private readonly membersRepo: Repository<MemberProfileEntity>,
    @InjectRepository(RefreshTokenEntity) private readonly refreshTokensRepo: Repository<RefreshTokenEntity>,
  ) {}

  async register(dto: RegisterDto) {
    const existed = await this.membersRepo.findOne({ where: [{ email: dto.email }, { username: dto.username }] });
    if (existed) throw new BadRequestException('Email or username already exists');

    const memberRole = await this.rolesRepo.findOneByOrFail({ code: RoleCode.MEMBER });
    const user = await this.usersRepo.save(this.usersRepo.create({ roleId: memberRole.id }));
    const passwordHash = await hash(dto.password, 12);
    await this.membersRepo.save(
      this.membersRepo.create({ userId: user.id, email: dto.email, username: dto.username, passwordHash }),
    );

    return this.issueTokenPair(user.id, memberRole.code);
  }

  async login(dto: LoginDto) {
    const member = await this.membersRepo.findOne({ where: { email: dto.email }, relations: ['user', 'user.role'] });
    if (!member) throw new UnauthorizedException('Invalid credentials');

    const valid = await compare(dto.password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokenPair(member.userId, member.user.role.code);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; role: string; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.refreshTokensRepo.findOne({
      where: {
        userId: payload.sub,
        tokenJti: payload.jti,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!stored) throw new UnauthorizedException('Refresh session is invalid');

    const valid = await compare(refreshToken, stored.tokenHash);
    if (!valid) throw new UnauthorizedException('Refresh session is invalid');

    stored.revokedAt = new Date();
    await this.refreshTokensRepo.save(stored);
    return this.issueTokenPair(payload.sub, payload.role);
  }

  async logout(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; jti: string }>(refreshToken, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
    await this.refreshTokensRepo.update(
      { userId: payload.sub, tokenJti: payload.jti, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['role', 'memberProfile', 'statuses'],
    });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      role: user.role.code,
      statuses: user.statuses.filter((s) => s.isActive).map((s) => s.statusCode),
      profile: user.memberProfile
        ? { username: user.memberProfile.username, email: user.memberProfile.email }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async issueTokenPair(userId: string, roleCode: string) {
    const accessPayload = { sub: userId, role: roleCode };
    const refreshPayload = { ...accessPayload, jti: randomUUID() };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d') as any,
    });

    const refreshTokenHash = await hash(refreshToken, 12);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await this.refreshTokensRepo.save(
      this.refreshTokensRepo.create({
        userId,
        tokenJti: refreshPayload.jti,
        tokenHash: refreshTokenHash,
        expiresAt,
      }),
    );

    return { accessToken, refreshToken };
  }
}
