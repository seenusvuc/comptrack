import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Global()
@Module({
	imports: [
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET') || 'change-me-in-production',
				signOptions: {
					expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1d',
				},
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtAuthGuard],
	exports: [JwtModule, AuthService, JwtAuthGuard],
})
export class AuthModule {}
