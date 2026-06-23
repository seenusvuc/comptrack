import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(page: number, pageSize: number, search?: string) {
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { employeeCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.appUser.count({ where }),
      this.prisma.appUser.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item: Parameters<UsersService['toUserResponse']>[0]) => this.toUserResponse(item)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async setRoles(userId: string, roleCodes: string[]) {
    const user = await this.prisma.appUser.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.prisma.appRole.findMany({ where: { roleCode: { in: roleCodes } } });
    if (roles.length !== roleCodes.length) {
      throw new NotFoundException('One or more roles were not found');
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.userRole.deleteMany({ where: { userId } });
      for (const role of roles) {
        await tx.userRole.create({
          data: {
            userId,
            roleId: role.id,
          },
        });
      }
    });

    const updated = await this.prisma.appUser.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    return updated ? this.toUserResponse(updated) : null;
  }

  async assignManager(userId: string, managerId: string, effectiveFrom: string, effectiveTo?: string) {
    const [employee, manager, managerRoles] = await this.prisma.$transaction([
      this.prisma.appUser.findUnique({ where: { id: userId } }),
      this.prisma.appUser.findUnique({ where: { id: managerId } }),
      this.prisma.userRole.findMany({
        where: { userId: managerId },
        include: { role: true },
      }),
    ]);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }
    if (!managerRoles.some((userRole: { role: { roleCode: string } }) => ['manager', 'super_admin'].includes(userRole.role.roleCode))) {
      throw new BadRequestException('Assigned manager must have manager or super_admin role');
    }

    await this.prisma.employeeManagerMap.updateMany({
      where: { employeeId: userId, effectiveTo: null },
      data: { effectiveTo: new Date(effectiveFrom) },
    });

    return this.prisma.employeeManagerMap.create({
      data: {
        employeeId: userId,
        managerId,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });
  }

  private toUserResponse(item: {
    id: string;
    authSubject: string;
    employeeCode: string | null;
    email: string;
    fullName: string;
    department: string | null;
    team: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    userRoles: Array<{ role: { roleCode: string } }>;
  }) {
    return {
      id: item.id,
      authSubject: item.authSubject,
      employeeCode: item.employeeCode,
      email: item.email,
      fullName: item.fullName,
      department: item.department,
      team: item.team,
      isActive: item.isActive,
      lastLoginAt: item.lastLoginAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      roles: item.userRoles.map((userRole: { role: { roleCode: string } }) => userRole.role.roleCode),
    };
  }
}
