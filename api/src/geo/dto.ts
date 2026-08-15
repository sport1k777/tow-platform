import { Type } from 'class-transformer';
import { IsNumber, IsString, MinLength, ValidateNested } from 'class-validator';

export class GeocodeDto {
  @IsString()
  @MinLength(2)
  query!: string;
}

export class LatLngDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class ReverseDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class RouteDto {
  @Type(() => LatLngDto)
  @ValidateNested()
  origin!: LatLngDto;

  @Type(() => LatLngDto)
  @ValidateNested()
  destination!: LatLngDto;
}
