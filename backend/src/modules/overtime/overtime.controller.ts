import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, CurrentUserClaims } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OvertimeInput, OvertimeService } from './overtime.service';

@ApiTags('Overtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('overtime-entries')
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Get()
  @Roles('employee', 'manager', 'hr_admin', 'super_admin')
  list(
    @CurrentUser() user: CurrentUserClaims,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const roles = user.roles || [];
    return this.overtimeService.listByActor(user.sub, roles, Number(page), Number(pageSize));
  }

  @Post()
  @Roles('employee')
  create(@CurrentUser() user: CurrentUserClaims, @Body() body: OvertimeInput) {
    return this.overtimeService.create(user.sub, body);
  }

  @Patch(':entryId')
  @Roles('employee')
  update(@CurrentUser() user: CurrentUserClaims, @Param('entryId') entryId: string, @Body() body: Partial<OvertimeInput>) {
    return this.overtimeService.update(user.sub, entryId, body);
  }

  @Post(':entryId/submit')
  @Roles('employee')
  submit(@CurrentUser() user: CurrentUserClaims, @Param('entryId') entryId: string) {
    return this.overtimeService.submit(user.sub, entryId);
  }

  @Post(':entryId/cancel')
  @Roles('employee')
  cancel(@CurrentUser() user: CurrentUserClaims, @Param('entryId') entryId: string) {
    return this.overtimeService.cancel(user.sub, entryId);
  }

}
