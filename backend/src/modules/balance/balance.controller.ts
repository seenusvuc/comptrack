import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, CurrentUserClaims } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BalanceService } from './balance.service';

@ApiTags('Balance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('me')
  @Roles('employee', 'manager', 'hr_admin', 'super_admin')
  myBalance(@CurrentUser() user: CurrentUserClaims) {
    return this.balanceService.myBalance(user.sub);
  }

  @Get('me/ledger')
  @Roles('employee', 'manager', 'hr_admin', 'super_admin')
  myLedger(
    @CurrentUser() user: CurrentUserClaims,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.balanceService.myLedger(user.sub, Number(page), Number(pageSize));
  }

  @Get('team')
  @Roles('manager')
  teamBalance(@CurrentUser() user: CurrentUserClaims, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.balanceService.teamBalance(user.sub, Number(page), Number(pageSize));
  }
}
