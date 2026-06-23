import { Injectable } from '@nestjs/common';

import { LedgerService } from '../../common/services/ledger.service';
import { UserContextService } from '../../common/services/user-context.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class BalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContextService: UserContextService,
    private readonly ledgerService: LedgerService,
  ) {}

  async myBalance(sub: string) {
    const actor = await this.userContextService.getRequiredAppUserById(sub);
    return this.ledgerService.getSummary(actor.id);
  }

  async myLedger(sub: string, page: number, pageSize: number) {
    const actor = await this.userContextService.getRequiredAppUserById(sub);
    return this.ledgerService.listLedger(actor.id, page, pageSize);
  }

  async teamBalance(sub: string, page: number, pageSize: number) {
    const manager = await this.userContextService.getRequiredAppUserById(sub);
    const reportees = await this.prisma.employeeManagerMap.findMany({
      where: {
        managerId: manager.id,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      include: { employee: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await this.prisma.employeeManagerMap.count({
      where: {
        managerId: manager.id,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
    });

    const items = await Promise.all(
      reportees.map(async (map: { employeeId: string; employee: { id: string; fullName: string } }) => {
        const summary = await this.ledgerService.getSummary(map.employeeId);
        return {
          employeeId: map.employee.id,
          employeeName: map.employee.fullName,
          availableHours: summary.availableHours,
          pendingOvertimeHours: 0,
          pendingCompOffHours: 0,
        };
      }),
    );

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
