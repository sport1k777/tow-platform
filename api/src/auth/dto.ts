import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @MinLength(10)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @MinLength(10)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @IsIn(['customer', 'driver'])
  role?: 'customer' | 'driver';
}

export class RefreshDto {
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
