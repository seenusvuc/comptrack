import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, CurrentUserClaims } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { BootstrapAdminRequest, LoginRequest, RegisterRequest } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap-admin')
  bootstrapAdmin(@Body() body: BootstrapAdminRequest) {
    return this.authService.bootstrapAdmin(body);
  }

  @Post('register')
  register(@Body() body: RegisterRequest) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginRequest) {
    return this.authService.login(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserClaims) {
    return this.authService.me(user.sub);
  }
}
