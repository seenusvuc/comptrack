import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';

export interface LedgerSummary {
  creditedHours: number;
  debitedHours: number;
  availableHours: number;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private decimalToNumber(value: { toString(): string } | number | null | undefined): number {
    if (value == null) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    return Number(value.toString());
  }

  async getSummary(employeeId: string, tx?: any): Promise<LedgerSummary> {
    const db = tx || this.prisma;
    const today = new Date();

    const credits = await db.compOffLedger.aggregate({
      _sum: { hours: true },
      where: {
        employeeId,
        entryType: 'credit',
        OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
      },
    });

    const debits = await db.compOffLedger.aggregate({
      _sum: { hours: true },
      where: { employeeId, entryType: 'debit' },
    });

    const creditedHours = this.decimalToNumber(credits._sum.hours);
    const debitedHours = this.decimalToNumber(debits._sum.hours);
    return {
      creditedHours,
      debitedHours,
      availableHours: Number((creditedHours - debitedHours).toFixed(2)),
    };
  }

  async listLedger(employeeId: string, page: number, pageSize: number) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.compOffLedger.count({ where: { employeeId } }),
      this.prisma.compOffLedger.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
