import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { documentTypes, type DocumentType } from '../config/market';

export class UploadDocumentDto {
  @IsIn([...documentTypes])
  type!: DocumentType;
}

export class RejectReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  reason!: string;
}

export class AdminDocumentActionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  reason?: string;
}
