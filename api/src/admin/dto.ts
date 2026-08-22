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
  @IsString()
  cityCode?: string;

  @IsOptional()
  @IsIn(['car', 'suv', 'van', 'truck', 'motorcycle'])
  vehicleCategory?: 'car' | 'suv' | 'van' | 'truck' | 'motorcycle';

  @IsOptional()
  @IsString()
  optionKey?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hourlyFeeKopiyky?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moverFeeKopiyky?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  floorFeeKopiyky?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noElevatorFeeKopiyky?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  waitingFeeKopiyky?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  outsideCityPerKmKopiyky?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminDriverStatusDto {
  @IsIn([
    'approved',
    'suspended',
    'rejected',
    'under_review',
    'pending_verification',
    'incomplete',
    'expired',
  ])
  verificationStatus!:
    | 'approved'
    | 'suspended'
    | 'rejected'
    | 'under_review'
    | 'pending_verification'
    | 'incomplete'
    | 'expired';

  @IsOptional()
  @IsString()
  reason?: string;
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
