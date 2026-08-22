import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { createDocumentVerificationProvider } from './create-verification-provider';
import { DOCUMENT_VERIFICATION_PROVIDER } from './document-verification.provider';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: DOCUMENT_VERIFICATION_PROVIDER,
      useFactory: createDocumentVerificationProvider,
    },
  ],
  exports: [DocumentsService],
})
export class VerificationModule {}
