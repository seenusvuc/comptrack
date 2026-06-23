import { Injectable } from '@nestjs/common';

import { UserContextService } from '../../common/services/user-context.service';
import { PrismaService } from '../../prisma.service';

export interface UpdatePolicyInput {
  conversionRatio: number;
  minUnitHours: number;
  maxCarryForwardHours: number;
  expiryDays: number;
  allowNegativeBalance: boolean;
  timezoneName: string;
}

@Injectable()
export class PolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContextService: UserContextService,
  ) {}

  async getPolicy() {
    const existing = await this.prisma.policySettings.findUnique({ where: { id: 1 } });
    if (existing) {
      return existing;
    }

    return this.prisma.policySettings.create({
      data: {
        id: 1,
      },
    });
  }

  async updatePolicy(actorSub: string, input: UpdatePolicyInput) {
    const actor = await this.userContextService.getRequiredAppUserById(actorSub);

    return this.prisma.policySettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        conversionRatio: input.conversionRatio,
        minUnitHours: input.minUnitHours,
        maxCarryForwardHours: input.maxCarryForwardHours,
        expiryDays: input.expiryDays,
        allowNegativeBalance: input.allowNegativeBalance,
        timezoneName: input.timezoneName,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      update: {
        conversionRatio: input.conversionRatio,
        minUnitHours: input.minUnitHours,
        maxCarryForwardHours: input.maxCarryForwardHours,
        expiryDays: input.expiryDays,
        allowNegativeBalance: input.allowNegativeBalance,
        timezoneName: input.timezoneName,
        updatedBy: actor.id,
      },
    });
  }
}
