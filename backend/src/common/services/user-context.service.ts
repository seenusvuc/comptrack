import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';

@Injectable()
export class UserContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getRequiredAppUserById(userId: string) {
    const user = await this.prisma.appUser.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new ForbiddenException('User is not provisioned in application database');
    }
    return user;
  }

  getRoles(claims: { roles?: string[] }): string[] {
    return claims.roles || [];
  }
}
