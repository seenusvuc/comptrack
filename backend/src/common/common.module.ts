import { Global, Module } from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { AuthorizationService } from './services/authorization.service';
import { BootstrapService } from './services/bootstrap.service';
import { LedgerService } from './services/ledger.service';
import { UserContextService } from './services/user-context.service';

@Global()
@Module({
  providers: [PrismaService, UserContextService, AuthorizationService, LedgerService, BootstrapService],
  exports: [PrismaService, UserContextService, AuthorizationService, LedgerService, BootstrapService],
})
export class CommonModule {}
