import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdminPricingDto {
  @IsIn(['tow', 'moving', 'cargo', 'roadside'])
  serviceKey!: 'tow' | 'moving' | 'cargo' | 'roadside';

  @IsOptional()
  @IsIn(['car', 'suv', 'van', 'motorcycle'])
  vehicleCategory?: 'car' | 'suv' | 'van' | 'motorcycle';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseFeeKopiyky!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  perKmKopiyky!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFeeKopiyky!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  nightMultiplierBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weekendMultiplierBps?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminDriverStatusDto {
  @IsIn(['approved', 'suspended', 'rejected', 'under_review', 'pending_verification'])
  verificationStatus!:
    | 'approved'
    | 'suspended'
    | 'rejected'
    | 'under_review'
    | 'pending_verification';
}

export class AdminOrderStatusDto {
  @IsString()
  reason!: string;

  @IsIn([
    'searching',
    'cancelled',
    'expired',
    'completed',
  ])
  status!: 'searching' | 'cancelled' | 'expired' | 'completed';
}
