import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, CurrentUserClaims } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PolicyService, UpdatePolicyInput } from './policy.service';

@ApiTags('Policy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  @Roles('employee', 'manager', 'hr_admin', 'super_admin')
  get() {
    return this.policyService.getPolicy();
  }

  @Put()
  @Roles('hr_admin', 'super_admin')
  update(@CurrentUser() user: CurrentUserClaims, @Body() body: UpdatePolicyInput) {
    return this.policyService.updatePolicy(user.sub, body);
  }
}
