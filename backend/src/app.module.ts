import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { BalanceModule } from './modules/balance/balance.module';
import { CompOffModule } from './modules/compoff/compoff.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { PolicyModule } from './modules/policy/policy.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    ApprovalsModule,
    UsersModule,
    OvertimeModule,
    CompOffModule,
    BalanceModule,
    PolicyModule,
  ],
})
export class AppModule {}
