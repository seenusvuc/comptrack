import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UserContextService } from '../../common/services/user-context.service';
import { PrismaService } from '../../prisma.service';

export interface OvertimeInput {
  workDate: string;
  startTime?: string;
  endTime?: string;
  overtimeHours: number;
  reason: string;
  projectCode?: string;
}

@Injectable()
export class OvertimeService {
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

  async create(actorSub: string, input: OvertimeInput) {
    if (input.overtimeHours <= 0) {
      throw new BadRequestException('overtimeHours must be positive');
    }

    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    return this.prisma.overtimeEntry.create({
      data: {
        employeeId: actor.id,
        workDate: new Date(input.workDate),
        startTime: input.startTime ? new Date(input.startTime) : null,
        endTime: input.endTime ? new Date(input.endTime) : null,
        overtimeHours: input.overtimeHours,
        reason: input.reason,
        projectCode: input.projectCode,
        status: 'draft',
      },
    });
  }

  async update(actorSub: string, entryId: string, input: Partial<OvertimeInput>) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    const existing = await this.prisma.overtimeEntry.findUnique({ where: { id: entryId } });

    if (!existing) {
      throw new NotFoundException('Overtime entry not found');
    }
    if (existing.employeeId !== actor.id) {
      throw new ForbiddenException('Cannot edit another employee overtime entry');
    }
    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft entries can be edited');
    }

    return this.prisma.overtimeEntry.update({
      where: { id: entryId },
      data: {
        workDate: input.workDate ? new Date(input.workDate) : undefined,
        startTime: input.startTime ? new Date(input.startTime) : undefined,
        endTime: input.endTime ? new Date(input.endTime) : undefined,
        overtimeHours: input.overtimeHours,
        reason: input.reason,
        projectCode: input.projectCode,
      },
    });
  }

  async submit(actorSub: string, entryId: string) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    const existing = await this.prisma.overtimeEntry.findUnique({ where: { id: entryId } });

    if (!existing) {
      throw new NotFoundException('Overtime entry not found');
    }
    if (existing.employeeId !== actor.id) {
      throw new ForbiddenException('Cannot submit another employee overtime entry');
    }
    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft entries can be submitted');
    }

    return this.prisma.overtimeEntry.update({
      where: { id: entryId },
      data: { status: 'submitted', submittedAt: new Date() },
    });
  }

  async cancel(actorSub: string, entryId: string) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);
    const existing = await this.prisma.overtimeEntry.findUnique({ where: { id: entryId } });

    if (!existing) {
      throw new NotFoundException('Overtime entry not found');
    }
    if (existing.employeeId !== actor.id) {
      throw new ForbiddenException('Cannot cancel another employee overtime entry');
    }
    if (!['draft', 'submitted'].includes(existing.status)) {
      throw new BadRequestException('Only draft or submitted entries can be cancelled');
    }

    return this.prisma.overtimeEntry.update({
      where: { id: entryId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
  }

  private async findPaged(where: Record<string, unknown>, page: number, pageSize: number) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.overtimeEntry.count({ where }),
      this.prisma.overtimeEntry.findMany({
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
