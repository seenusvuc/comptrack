import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertManagerCanApproveEmployee(managerId: string, employeeId: string) {
    const today = new Date();
    const relation = await this.prisma.employeeManagerMap.findFirst({
      where: {
        employeeId,
        managerId,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
    });

    if (!relation) {
      throw new ForbiddenException('Manager can only approve direct report requests');
    }
  }
}
