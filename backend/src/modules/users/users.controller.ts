import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('hr_admin', 'super_admin')
  listUsers(@Query('page') page = '1', @Query('pageSize') pageSize = '20', @Query('search') search?: string) {
    return this.usersService.listUsers(Number(page), Number(pageSize), search);
  }

  @Put(':userId/manager')
  @Roles('super_admin')
  assignManager(
    @Param('userId') userId: string,
    @Body() body: { managerId: string; effectiveFrom: string; effectiveTo?: string },
  ) {
    return this.usersService.assignManager(userId, body.managerId, body.effectiveFrom, body.effectiveTo);
  }

  @Put(':userId/roles')
  @Roles('super_admin')
  setRoles(@Param('userId') userId: string, @Body() body: { roles: string[] }) {
    return this.usersService.setRoles(userId, body.roles);
  }
}
