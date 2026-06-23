import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedRoles();
    await this.seedPolicy();

    // Keep dev/demo bootstrap data out of internet production deployments.
    if (process.env.NODE_ENV !== 'production') {
      await this.seedDemoUsers();
      await this.seedDemoData();
    }
  }

  private async seedRoles() {
    const roles = [
      { roleCode: 'employee', roleName: 'Employee' },
      { roleCode: 'manager', roleName: 'Manager' },
      { roleCode: 'hr_admin', roleName: 'HR Admin' },
      { roleCode: 'super_admin', roleName: 'Super Admin' },
    ];

    for (const role of roles) {
      await this.prisma.appRole.upsert({
        where: { roleCode: role.roleCode },
        update: { roleName: role.roleName },
        create: role,
      });
    }
  }

  private async seedPolicy() {
    await this.prisma.policySettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        conversionRatio: 1,
        minUnitHours: 0.5,
        maxCarryForwardHours: 160,
        expiryDays: 180,
        allowNegativeBalance: false,
        timezoneName: 'UTC',
      },
    });
  }

  private async seedDemoUsers() {
    const demoUsers = [
      {
        email: 'superadmin@example.com',
        fullName: 'Super Admin',
        employeeCode: 'SA001',
        department: 'Administration',
        team: 'Leadership',
        roles: ['super_admin'],
      },
      {
        email: 'manager1@example.com',
        fullName: 'Manager One',
        employeeCode: 'MN001',
        department: 'Engineering',
        team: 'Platform',
        roles: ['manager'],
      },
      {
        email: 'employee1@example.com',
        fullName: 'Employee One',
        employeeCode: 'EM001',
        department: 'Engineering',
        team: 'Platform',
        roles: ['employee'],
      },
      {
        email: 'hr1@example.com',
        fullName: 'HR Admin',
        employeeCode: 'HR001',
        department: 'People',
        team: 'Operations',
        roles: ['hr_admin'],
      },
    ];

    const passwordHash = this.hashPassword('ChangeMe123!');

    for (const demoUser of demoUsers) {
      const user = await this.prisma.appUser.upsert({
        where: { email: demoUser.email },
        update: {
          authSubject: `local:${demoUser.email}`,
          fullName: demoUser.fullName,
          employeeCode: demoUser.employeeCode,
          department: demoUser.department,
          team: demoUser.team,
          passwordHash,
        },
        create: {
          authSubject: `local:${demoUser.email}`,
          email: demoUser.email,
          fullName: demoUser.fullName,
          employeeCode: demoUser.employeeCode,
          department: demoUser.department,
          team: demoUser.team,
          passwordHash,
        },
      });

      const roles = await this.prisma.appRole.findMany({ where: { roleCode: { in: demoUser.roles } } });
      await this.prisma.userRole.deleteMany({ where: { userId: user.id } });
      for (const role of roles) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }
    }

    const manager = await this.prisma.appUser.findUnique({ where: { email: 'manager1@example.com' } });
    const employee = await this.prisma.appUser.findUnique({ where: { email: 'employee1@example.com' } });

    if (manager && employee) {
      const existing = await this.prisma.employeeManagerMap.findFirst({
        where: { employeeId: employee.id, managerId: manager.id, effectiveTo: null },
      });

      if (!existing) {
        await this.prisma.employeeManagerMap.create({
          data: {
            employeeId: employee.id,
            managerId: manager.id,
            effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
            effectiveTo: null,
          },
        });
      }
    }
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private async seedDemoData() {
    const employee = await this.prisma.appUser.findUnique({ where: { email: 'employee1@example.com' } });
    const manager = await this.prisma.appUser.findUnique({ where: { email: 'manager1@example.com' } });
    if (!employee || !manager) return;

    // Skip if demo data already seeded
    const existing = await this.prisma.overtimeEntry.count({ where: { employeeId: employee.id } });
    if (existing > 0) return;

    // Approved overtime entry 1 — Jan 10 2026, 4h
    const ot1 = await this.prisma.overtimeEntry.create({
      data: {
        employeeId: employee.id,
        workDate: new Date('2026-01-10T00:00:00.000Z'),
        overtimeHours: 4,
        reason: 'Quarter-end release deployment',
        projectCode: 'PROJ-001',
        status: 'approved',
        submittedAt: new Date('2026-01-11T09:00:00.000Z'),
        approvedAt: new Date('2026-01-12T10:00:00.000Z'),
      },
    });
    await this.prisma.overtimeApproval.create({
      data: {
        overtimeEntryId: ot1.id,
        managerId: manager.id,
        action: 'approved',
        comment: 'Confirmed - release went late',
        actionAt: new Date('2026-01-12T10:00:00.000Z'),
      },
    });
    await this.prisma.compOffLedger.create({
      data: {
        employeeId: employee.id,
        entryType: 'credit',
        sourceType: 'overtime_approval',
        sourceId: ot1.id,
        hours: 4,
        expiresAt: new Date('2026-07-11T00:00:00.000Z'),
        createdBy: manager.id,
        note: `Credit from approved overtime ${ot1.id}`,
      },
    });

    // Approved overtime entry 2 — Feb 14 2026, 3h
    const ot2 = await this.prisma.overtimeEntry.create({
      data: {
        employeeId: employee.id,
        workDate: new Date('2026-02-14T00:00:00.000Z'),
        overtimeHours: 3,
        reason: 'Critical production hotfix',
        projectCode: 'PROJ-002',
        status: 'approved',
        submittedAt: new Date('2026-02-15T08:30:00.000Z'),
        approvedAt: new Date('2026-02-16T11:00:00.000Z'),
      },
    });
    await this.prisma.overtimeApproval.create({
      data: {
        overtimeEntryId: ot2.id,
        managerId: manager.id,
        action: 'approved',
        actionAt: new Date('2026-02-16T11:00:00.000Z'),
      },
    });
    await this.prisma.compOffLedger.create({
      data: {
        employeeId: employee.id,
        entryType: 'credit',
        sourceType: 'overtime_approval',
        sourceId: ot2.id,
        hours: 3,
        expiresAt: new Date('2026-08-15T00:00:00.000Z'),
        createdBy: manager.id,
        note: `Credit from approved overtime ${ot2.id}`,
      },
    });

    // Submitted overtime entry — May 20 2026, 2h (awaiting approval)
    await this.prisma.overtimeEntry.create({
      data: {
        employeeId: employee.id,
        workDate: new Date('2026-05-20T00:00:00.000Z'),
        overtimeHours: 2,
        reason: 'Sprint demo preparation',
        projectCode: 'PROJ-001',
        status: 'submitted',
        submittedAt: new Date('2026-05-21T09:00:00.000Z'),
      },
    });

    // Draft overtime entry — Jun 2 2026, 1.5h
    await this.prisma.overtimeEntry.create({
      data: {
        employeeId: employee.id,
        workDate: new Date('2026-06-02T00:00:00.000Z'),
        overtimeHours: 1.5,
        reason: 'Infra migration support',
        status: 'draft',
      },
    });

    // Approved comp-off request — Mar 15 2026, 3h
    const co1 = await this.prisma.compOffRequest.create({
      data: {
        employeeId: employee.id,
        requestDate: new Date('2026-03-15T00:00:00.000Z'),
        requestedHours: 3,
        reason: 'Anniversary leave',
        status: 'approved',
        submittedAt: new Date('2026-03-10T09:00:00.000Z'),
        approvedAt: new Date('2026-03-11T10:00:00.000Z'),
      },
    });
    await this.prisma.compOffApproval.create({
      data: {
        compoffRequestId: co1.id,
        managerId: manager.id,
        action: 'approved',
        comment: 'Approved',
        actionAt: new Date('2026-03-11T10:00:00.000Z'),
      },
    });
    await this.prisma.compOffLedger.create({
      data: {
        employeeId: employee.id,
        entryType: 'debit',
        sourceType: 'compoff_approval',
        sourceId: co1.id,
        hours: 3,
        createdBy: manager.id,
        note: `Debit from approved comp-off ${co1.id}`,
      },
    });

    // Submitted comp-off request — Jun 10 2026, 2h (awaiting approval)
    await this.prisma.compOffRequest.create({
      data: {
        employeeId: employee.id,
        requestDate: new Date('2026-06-10T00:00:00.000Z'),
        requestedHours: 2,
        reason: 'Day off after project milestone',
        status: 'submitted',
        submittedAt: new Date('2026-06-10T09:00:00.000Z'),
      },
    });
  }
}
