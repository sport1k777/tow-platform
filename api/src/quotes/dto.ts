import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { serviceKeyEnum, vehicleCategoryEnum } from '../db/schema';

export class QuoteLocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @IsString()
  @MinLength(1)
  label!: string;
}

export class CreateQuoteDto {
  @IsIn(serviceKeyEnum.enumValues)
  serviceKey!: (typeof serviceKeyEnum.enumValues)[number];

  @Type(() => QuoteLocationDto)
  @ValidateNested()
  pickup!: QuoteLocationDto;

  @IsOptional()
  @Type(() => QuoteLocationDto)
  @ValidateNested()
  destination?: QuoteLocationDto;

  @IsOptional()
  @IsIn(vehicleCategoryEnum.enumValues)
  vehicleCategory?: (typeof vehicleCategoryEnum.enumValues)[number];

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
