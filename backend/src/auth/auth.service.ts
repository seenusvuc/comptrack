import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma.service';
import { BootstrapAdminRequest, LoginRequest, RegisterRequest } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async bootstrapAdmin(input: BootstrapAdminRequest) {
    const existingSuperAdmins = await this.prisma.userRole.count({
      where: { role: { roleCode: 'super_admin' } },
    });

    if (existingSuperAdmins > 0) {
      throw new ConflictException('Bootstrap admin is already configured');
    }

    return this.createUserWithRole(input, 'super_admin');
  }

  async register(input: RegisterRequest) {
    return this.createUserWithRole(input, 'employee');
  }

  async login(input: LoginRequest) {
    const user = await this.prisma.appUser.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.appUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userRoles.map((userRole: { role: { roleCode: string } }) => userRole.role.roleCode);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      name: user.fullName,
      roles,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.appUser.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.userRoles.map((userRole: { role: { roleCode: string } }) => userRole.role.roleCode),
    };
  }

  private async createUserWithRole(input: RegisterRequest, roleCode: string) {
    const email = input.email.trim().toLowerCase();
    this.assertStrongPassword(input.password);
    const existingUser = await this.prisma.appUser.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const role = await this.prisma.appRole.findUnique({ where: { roleCode } });
    if (!role) {
      throw new ConflictException(`Role ${roleCode} is not configured`);
    }

    const passwordHash = this.hashPassword(input.password);

    const user = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.appUser.create({
        data: {
          authSubject: `local:${email}`,
          email,
          fullName: input.fullName,
          employeeCode: input.employeeCode,
          department: input.department,
          team: input.team,
          passwordHash,
        },
      });

      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: role.id,
        },
      });

      return created;
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: [roleCode],
    };
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return false;
    }
    const derived = scryptSync(password, salt, 64);
    const stored = Buffer.from(key, 'hex');
    if (stored.length !== derived.length) {
      return false;
    }
    return timingSafeEqual(stored, derived);
  }

  private assertStrongPassword(password: string) {
    const strongEnough = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
    if (!strongEnough) {
      throw new BadRequestException(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      );
    }
  }
}
