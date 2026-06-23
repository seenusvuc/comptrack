import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuthorizationService } from '../../common/services/authorization.service';
import { LedgerService } from '../../common/services/ledger.service';
import { UserContextService } from '../../common/services/user-context.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContextService: UserContextService,
    private readonly authorizationService: AuthorizationService,
    private readonly ledgerService: LedgerService,
  ) {}

  async approveOvertime(managerSub: string, entryId: string, comment?: string) {
    const manager = await this.userContextService.getRequiredAppUserById(managerSub);
    const entry = await this.prisma.overtimeEntry.findUnique({ where: { id: entryId } });

    if (!entry) {
      throw new NotFoundException('Overtime entry not found');
    }
    if (entry.status !== 'submitted') {
      throw new BadRequestException('Only submitted overtime entries can be approved');
    }

    await this.authorizationService.assertManagerCanApproveEmployee(manager.id, entry.employeeId);

    const policy = await this.prisma.policySettings.findUnique({ where: { id: 1 } });
    const ratio = Number(policy?.conversionRatio?.toString() || '1');
    const expiryDays = policy?.expiryDays ?? 180;
    const overtimeHours = Number(entry.overtimeHours.toString());
    const creditHours = Number((overtimeHours * ratio).toFixed(2));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.overtimeEntry.update({
        where: { id: entryId },
        data: { status: 'approved', approvedAt: new Date() },
      });

      await tx.overtimeApproval.create({
        data: {
          overtimeEntryId: entryId,
          managerId: manager.id,
          action: 'approved',
          comment,
        },
      });

      await tx.compOffLedger.create({
        data: {
          employeeId: entry.employeeId,
          entryType: 'credit',
          sourceType: 'overtime_approval',
          sourceId: entry.id,
          hours: creditHours,
          expiresAt,
          createdBy: manager.id,
          note: `Credit from approved overtime ${entry.id}`,
        },
      });

      return updated;
    });
  }

  async rejectOvertime(managerSub: string, entryId: string, comment?: string) {
    const manager = await this.userContextService.getRequiredAppUserById(managerSub);
    const entry = await this.prisma.overtimeEntry.findUnique({ where: { id: entryId } });

    if (!entry) {
      throw new NotFoundException('Overtime entry not found');
    }
    if (entry.status !== 'submitted') {
      throw new BadRequestException('Only submitted overtime entries can be rejected');
    }

    await this.authorizationService.assertManagerCanApproveEmployee(manager.id, entry.employeeId);

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.overtimeEntry.update({
        where: { id: entryId },
        data: { status: 'rejected', rejectedAt: new Date() },
      });

      await tx.overtimeApproval.create({
        data: {
          overtimeEntryId: entryId,
          managerId: manager.id,
          action: 'rejected',
          comment,
        },
      });

      return updated;
    });
  }

  async approveCompOff(managerSub: string, requestId: string, comment?: string) {
    const manager = await this.userContextService.getRequiredAppUserById(managerSub);
    const req = await this.prisma.compOffRequest.findUnique({ where: { id: requestId } });

    if (!req) {
      throw new NotFoundException('Comp-off request not found');
    }
    if (req.status !== 'submitted') {
      throw new BadRequestException('Only submitted comp-off requests can be approved');
    }

    await this.authorizationService.assertManagerCanApproveEmployee(manager.id, req.employeeId);

    return this.prisma.$transaction(async (tx: any) => {
      const policy = await tx.policySettings.findUnique({ where: { id: 1 } });
      const allowNegative = policy?.allowNegativeBalance ?? false;
      const requested = Number(req.requestedHours.toString());

      if (!allowNegative) {
        const summary = await this.ledgerService.getSummary(req.employeeId, tx);
        if (summary.availableHours < requested) {
          throw new BadRequestException(
            `Insufficient comp-off balance. available=${summary.availableHours}, requested=${requested}`,
          );
        }
      }

      const updated = await tx.compOffRequest.update({
        where: { id: requestId },
        data: { status: 'approved', approvedAt: new Date() },
      });

      await tx.compOffApproval.create({
        data: {
          compoffRequestId: requestId,
          managerId: manager.id,
          action: 'approved',
          comment,
        },
      });

      await tx.compOffLedger.create({
        data: {
          employeeId: req.employeeId,
          entryType: 'debit',
          sourceType: 'compoff_approval',
          sourceId: req.id,
          hours: req.requestedHours,
          createdBy: manager.id,
          note: `Debit from approved comp-off ${req.id}`,
        },
      });

      return updated;
    });
  }

  async rejectCompOff(managerSub: string, requestId: string, comment?: string) {
    const manager = await this.userContextService.getRequiredAppUserById(managerSub);
    const req = await this.prisma.compOffRequest.findUnique({ where: { id: requestId } });

    if (!req) {
      throw new NotFoundException('Comp-off request not found');
    }
    if (req.status !== 'submitted') {
      throw new BadRequestException('Only submitted comp-off requests can be rejected');
    }

    await this.authorizationService.assertManagerCanApproveEmployee(manager.id, req.employeeId);

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.compOffRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', rejectedAt: new Date() },
      });

      await tx.compOffApproval.create({
        data: {
          compoffRequestId: requestId,
          managerId: manager.id,
          action: 'rejected',
          comment,
        },
      });

      return updated;
    });
  }
}
