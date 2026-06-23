import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, CurrentUserClaims } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApprovalsService } from './approvals.service';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('overtime/:entryId/approve')
  @Roles('manager')
  approveOvertime(
    @CurrentUser() user: CurrentUserClaims,
    @Param('entryId') entryId: string,
    @Body() body: { comment?: string },
  ) {
    return this.approvalsService.approveOvertime(user.sub, entryId, body?.comment);
  }

  @Post('overtime/:entryId/reject')
  @Roles('manager')
  rejectOvertime(
    @CurrentUser() user: CurrentUserClaims,
    @Param('entryId') entryId: string,
    @Body() body: { comment?: string },
  ) {
    return this.approvalsService.rejectOvertime(user.sub, entryId, body?.comment);
  }

  @Post('compoff/:requestId/approve')
  @Roles('manager')
  approveCompOff(
    @CurrentUser() user: CurrentUserClaims,
    @Param('requestId') requestId: string,
    @Body() body: { comment?: string },
  ) {
    return this.approvalsService.approveCompOff(user.sub, requestId, body?.comment);
  }

  @Post('compoff/:requestId/reject')
  @Roles('manager')
  rejectCompOff(
    @CurrentUser() user: CurrentUserClaims,
    @Param('requestId') requestId: string,
    @Body() body: { comment?: string },
  ) {
    return this.approvalsService.rejectCompOff(user.sub, requestId, body?.comment);
  }
}
