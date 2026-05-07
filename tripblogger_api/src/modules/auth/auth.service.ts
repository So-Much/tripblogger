import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RoleEntity } from '../users/entities/role.entity';
import { RoleCode } from '../users/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatusEntity } from '../users/entities/user-status.entity';
import { UserStatusCode } from '../users/enums/status.enum';
import { GuestProfileEntity } from '../users/entities/guest-profile.entity';
import { OAuth2Client } from 'google-auth-library';
import { OAuthIdentityEntity, OAuthProvider } from './entities/oauth-identity.entity';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly rolesRepo: Repository<RoleEntity>,
    @InjectRepository(MemberProfileEntity) private readonly membersRepo: Repository<MemberProfileEntity>,
    @InjectRepository(RefreshTokenEntity) private readonly refreshTokensRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(UserStatusEntity) private readonly userStatusesRepo: Repository<UserStatusEntity>,
    @InjectRepository(GuestProfileEntity) private readonly guestProfilesRepo: Repository<GuestProfileEntity>,
    @InjectRepository(OAuthIdentityEntity) private readonly oauthIdentitiesRepo: Repository<OAuthIdentityEntity>,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const existed = await this.membersRepo.findOne({ where: { username: dto.username } });
    if (existed) throw new BadRequestException('Username already exists');

    const memberRole = await this.rolesRepo.findOneByOrFail({ code: RoleCode.MEMBER });
    const user = await this.usersRepo.save(this.usersRepo.create({ roleId: memberRole.id }));
    const passwordHash = await hash(dto.password, 12);
    await this.membersRepo.save(
      this.membersRepo.create({
        userId: user.id,
        email: null,
        username: dto.username,
        passwordHash,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
      }),
    );

    await this.userStatusesRepo.save(
      this.userStatusesRepo.create({
        userId: user.id,
        statusCode: UserStatusCode.ACTIVE,
        isActive: true,
        source: 'register',
      }),
    );
    await this.userStatusesRepo.save(
      this.userStatusesRepo.create({
        userId: user.id,
        statusCode: UserStatusCode.PENDING_VERIFICATION,
        isActive: true,
        source: 'register',
      }),
    );

    return this.issueTokenPair(user.id, memberRole.code);
  }

  async login(dto: LoginDto) {
    const member = await this.membersRepo.findOne({ where: { username: dto.username }, relations: ['user', 'user.role'] });
    if (!member) throw new UnauthorizedException('Invalid credentials');

    const activeStatuses = await this.getActiveStatuses(member.userId);
    if (activeStatuses.includes(UserStatusCode.BANNED)) {
      throw new ForbiddenException('User is banned');
    }

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

  async guest(sessionId: string) {
    const guestRole = await this.rolesRepo.findOneByOrFail({ code: RoleCode.GUEST });

    const existing = await this.guestProfilesRepo.findOne({
      where: { sessionId },
      relations: ['user', 'user.role'],
    });

    if (existing) {
      const active = await this.getActiveStatuses(existing.userId);
      if (active.includes(UserStatusCode.BANNED)) {
        throw new ForbiddenException('User is banned');
      }
      await this.ensureStatusActive(existing.userId, UserStatusCode.ACTIVE, 'guest');
      return this.issueTokenPair(existing.userId, guestRole.code);
    }

    const user = await this.usersRepo.save(this.usersRepo.create({ roleId: guestRole.id }));
    await this.guestProfilesRepo.save(this.guestProfilesRepo.create({ userId: user.id, sessionId }));
    await this.ensureStatusActive(user.id, UserStatusCode.ACTIVE, 'guest');
    return this.issueTokenPair(user.id, guestRole.code);
  }

  async banGuest(sessionId: string, reason?: string) {
    const profile = await this.guestProfilesRepo.findOne({ where: { sessionId } });
    if (!profile) throw new BadRequestException('Guest session not found');

    await this.ensureStatusActive(profile.userId, UserStatusCode.BANNED, reason ? `admin-ban:${reason}` : 'admin-ban');

    await this.refreshTokensRepo.update(
      { userId: profile.userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return { success: true };
  }

  async googleLogin(idToken: string) {
    const audiences = this.configService
      .getOrThrow<string>('GOOGLE_OAUTH_AUDIENCES')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const ticket = await this.googleClient.verifyIdToken({ idToken, audience: audiences });
    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Invalid Google token');

    const googleSub = payload.sub;
    const identity = await this.oauthIdentitiesRepo.findOne({
      where: { provider: OAuthProvider.GOOGLE, providerSubject: googleSub },
    });

    if (identity) {
      const active = await this.getActiveStatuses(identity.userId);
      if (active.includes(UserStatusCode.BANNED)) throw new ForbiddenException('User is banned');
      const user = await this.usersRepo.findOne({ where: { id: identity.userId }, relations: ['role'] });
      if (!user) throw new UnauthorizedException('User not found');
      return this.issueTokenPair(user.id, user.role.code);
    }

    const memberRole = await this.rolesRepo.findOneByOrFail({ code: RoleCode.MEMBER });
    const user = await this.usersRepo.save(this.usersRepo.create({ roleId: memberRole.id }));

    const base = (payload.name ?? 'google-user').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const shortSub = googleSub.slice(-6);
    const baseUsername = (base.length >= 3 ? base : 'google').slice(0, 24);
    let username = `${baseUsername}_${shortSub}`;
    for (let i = 0; i < 20; i++) {
      const existed = await this.membersRepo.findOne({ where: { username } });
      if (!existed) break;
      username = `${baseUsername}_${shortSub}_${i + 1}`;
    }

    const passwordHash = await hash(`${randomUUID()}_${googleSub}`, 12);
    await this.membersRepo.save(
      this.membersRepo.create({
        userId: user.id,
        username,
        email: null,
        passwordHash,
        displayName: payload.name ?? undefined,
        avatarUrl: payload.picture ?? undefined,
      }),
    );

    await this.oauthIdentitiesRepo.save(
      this.oauthIdentitiesRepo.create({
        provider: OAuthProvider.GOOGLE,
        providerSubject: googleSub,
        userId: user.id,
      }),
    );

    await this.ensureStatusActive(user.id, UserStatusCode.ACTIVE, 'google');
    await this.ensureStatusActive(user.id, UserStatusCode.PENDING_VERIFICATION, 'google');

    return this.issueTokenPair(user.id, memberRole.code);
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
        ? {
            username: user.memberProfile.username,
            email: user.memberProfile.email,
            displayName: user.memberProfile.displayName ?? null,
            avatarUrl: user.memberProfile.avatarUrl ?? null,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async getActiveStatuses(userId: string): Promise<UserStatusCode[]> {
    const statuses = await this.userStatusesRepo.find({
      where: {
        userId,
        isActive: true,
        statusCode: In(Object.values(UserStatusCode)),
      },
    });
    return statuses.map((s) => s.statusCode as UserStatusCode);
  }

  private async ensureStatusActive(userId: string, statusCode: UserStatusCode, source?: string) {
    const existed = await this.userStatusesRepo.findOne({ where: { userId, statusCode } });
    if (!existed) {
      await this.userStatusesRepo.save(
        this.userStatusesRepo.create({ userId, statusCode, isActive: true, source }),
      );
      return;
    }

    if (!existed.isActive || existed.source !== source) {
      existed.isActive = true;
      existed.source = source;
      await this.userStatusesRepo.save(existed);
    }
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
