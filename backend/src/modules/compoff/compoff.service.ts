import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UserContextService } from '../../common/services/user-context.service';
import { PrismaService } from '../../prisma.service';

export interface CompOffInput {
  requestDate: string;
  requestedHours: number;
  reason: string;
}

@Injectable()
export class CompOffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContextService: UserContextService,
  ) {}

  async listByActor(actorSub: string, roles: string[], page: number, pageSize: number) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);

    if (roles.includes('employee') && !roles.includes('manager') && !roles.includes('hr_admin') && !roles.includes('super_admin')) {
      return this.findPaged({ employeeId: actor.id }, page, pageSize);
    }

    if (roles.includes('manager') && !roles.includes('hr_admin') && !roles.includes('super_admin')) {
      const reportees = await this.prisma.employeeManagerMap.findMany({
        where: {
          managerId: actor.id,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
        select: { employeeId: true },
      });

      return this.findPaged({ employeeId: { in: reportees.map((x: { employeeId: string }) => x.employeeId) } }, page, pageSize);
    }

    return this.findPaged({}, page, pageSize);
  }

  async create(actorSub: string, input: CompOffInput) {
    if (input.requestedHours <= 0) {
      throw new BadRequestException('requestedHours must be positive');
    }

    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    return this.prisma.compOffRequest.create({
      data: {
        employeeId: actor.id,
        requestDate: new Date(input.requestDate),
        requestedHours: input.requestedHours,
        reason: input.reason,
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
  }

  async getById(actorSub: string, roles: string[], requestId: string) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    const req = await this.prisma.compOffRequest.findUnique({ where: { id: requestId } });

    if (!req) {
      throw new NotFoundException('Comp-off request not found');
    }

    if (roles.includes('hr_admin') || roles.includes('super_admin')) {
      return req;
    }

    if (roles.includes('manager')) {
      const mapping = await this.prisma.employeeManagerMap.findFirst({
        where: {
          employeeId: req.employeeId,
          managerId: actor.id,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
      });
      if (mapping) {
        return req;
      }
    }

    if (req.employeeId !== actor.id) {
      throw new ForbiddenException('Cannot view another employee request');
    }

    return req;
  }

  async cancel(actorSub: string, requestId: string) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    const existing = await this.prisma.compOffRequest.findUnique({ where: { id: requestId } });

    if (!existing) {
      throw new NotFoundException('Comp-off request not found');
    }
    if (existing.employeeId !== actor.id) {
      throw new ForbiddenException('Cannot cancel another employee request');
    }
    if (existing.status !== 'submitted') {
      throw new BadRequestException('Only submitted requests can be cancelled');
    }

    return this.prisma.compOffRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
  }

  private async findPaged(where: Record<string, unknown>, page: number, pageSize: number) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.compOffRequest.count({ where }),
      this.prisma.compOffRequest.findMany({
        where,
        include: { employee: { select: { fullName: true, employeeCode: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
