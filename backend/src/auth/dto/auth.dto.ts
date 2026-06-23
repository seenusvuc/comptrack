import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  team?: string;
}

export class LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class BootstrapAdminRequest extends RegisterRequest {}
