import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, CurrentUserClaims } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompOffInput, CompOffService } from './compoff.service';

@ApiTags('CompOff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compoff-requests')
export class CompOffController {
  constructor(private readonly compOffService: CompOffService) {}

  @Get()
  @Roles('employee', 'manager', 'hr_admin', 'super_admin')
  list(
    @CurrentUser() user: CurrentUserClaims,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const roles = user.roles || [];
    return this.compOffService.listByActor(user.sub, roles, Number(page), Number(pageSize));
  }

  @Post()
  @Roles('employee')
  create(@CurrentUser() user: CurrentUserClaims, @Body() body: CompOffInput) {
    return this.compOffService.create(user.sub, body);
  }

  @Get(':requestId')
  @Roles('employee', 'manager', 'hr_admin', 'super_admin')
  getById(@CurrentUser() user: CurrentUserClaims, @Param('requestId') requestId: string) {
    const roles = user.roles || [];
    return this.compOffService.getById(user.sub, roles, requestId);
  }

  @Post(':requestId/cancel')
  @Roles('employee')
  cancel(@CurrentUser() user: CurrentUserClaims, @Param('requestId') requestId: string) {
    return this.compOffService.cancel(user.sub, requestId);
  }
}
