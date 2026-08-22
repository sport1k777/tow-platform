import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { PAYMENT_METHODS } from '../payments/methods';

export class CreateOrderDto {
  @IsUUID()
  quoteId!: string;

  @IsOptional()
  @IsIn([...PAYMENT_METHODS])
  paymentMethod?: (typeof PAYMENT_METHODS)[number];
}
