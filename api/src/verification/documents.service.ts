import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';

import { isMockVerificationEnabled, loadEnv } from '../config/env';
import {
  requiredDocumentsForMarket,
  type DocumentType,
} from '../config/market';
import type { Database } from '../db/database.module';
import { DATABASE } from '../db/database.tokens';
import {
  documentStatusEnum,
  driverDocuments,
  driverProfiles,
  driverVehicles,
  users,
  verificationEvents,
  verificationStatusEnum,
} from '../db/schema';
import { StorageService } from '../files/storage.service';
import {
  DOCUMENT_VERIFICATION_PROVIDER,
  type DocumentVerificationProvider,
} from './document-verification.provider';

type DocumentStatus = (typeof documentStatusEnum.enumValues)[number];
type DriverVerificationStatus = (typeof verificationStatusEnum.enumValues)[number];
type DocumentRow = typeof driverDocuments.$inferSelect;

export type EligibilityBlocker =
  | 'DRIVER_NOT_APPROVED'
  | 'DRIVER_SUSPENDED'
  | 'DOCUMENTS_INCOMPLETE'
  | 'DOCUMENTS_NOT_APPROVED'
  | 'DOCUMENT_EXPIRED'
  | 'DOCUMENT_REJECTED'
  | 'VEHICLE_NOT_APPROVED'
  | 'PROFILE_INCOMPLETE';

export type DriverEligibility = {
  canGoOnline: boolean;
  blockers: EligibilityBlocker[];
  requiredApproved: boolean;
  vehicleApproved: boolean;
  profileComplete: boolean;
};

const REQUIRED = requiredDocumentsForMarket();

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(DOCUMENT_VERIFICATION_PROVIDER)
    private readonly provider: DocumentVerificationProvider,
  ) {}

  verificationMeta() {
    const env = loadEnv();
    return {
      verificationMode: env.VERIFICATION_MODE,
      mockMode: isMockVerificationEnabled(env),
      providerId: this.provider.id,
      providerConfigured: this.provider.configured,
      providerMessage: this.provider.configured
        ? null
        : 'External verification provider is not configured.',
    };
  }

  async getDriverVerification(driverUserId: string, opts: { admin?: boolean } = {}) {
    const profile = await this.requireProfile(driverUserId);
    const [person] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, driverUserId))
      .limit(1);
    const rows = await this.db
      .select()
      .from(driverDocuments)
      .where(eq(driverDocuments.driverUserId, driverUserId));
    const byType = new Map(rows.map((row) => [row.type, row]));
    const documents = REQUIRED.map((type) => {
      const row = byType.get(type);
      const effective = row ? this.effectiveDocumentStatus(row) : 'not_submitted';
      return {
        id: row?.id ?? null,
        type,
        status: effective,
        uploadedAt: row?.uploadedAt.toISOString() ?? null,
        processedAt: row?.processedAt?.toISOString() ?? null,
        expiresAt: row?.expiresAt?.toISOString() ?? null,
        rejectionReason: row?.rejectionReason ?? null,
        verificationMethod: row?.verificationMethod ?? 'none',
        verifiedAt: row?.verifiedAt?.toISOString() ?? null,
        mimeType: row?.mimeType ?? null,
        ...(opts.admin
          ? {
              byteSize: row?.byteSize ?? null,
              extractedData: row?.extractedData ?? {},
              verifiedBy: row?.verifiedBy ?? null,
            }
          : {}),
      };
    });
    const approvedCount = documents.filter((doc) => doc.status === 'approved').length;
    const eligibility = await this.evaluateEligibility(driverUserId);
    const vehicles = await this.db
      .select()
      .from(driverVehicles)
      .where(eq(driverVehicles.driverUserId, driverUserId));

    return {
      driverUserId,
      phone: person?.phone ?? null,
      firstName: person?.firstName ?? null,
      lastName: person?.lastName ?? null,
      displayName: person?.displayName ?? null,
      hasAvatar: Boolean(person?.avatarStorageKey),
      verificationStatus: profile.verificationStatus,
      ...this.verificationMeta(),
      requiredCount: REQUIRED.length,
      approvedCount,
      documents,
      eligibility,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicleCategory: vehicle.vehicleCategory,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plateNumber: vehicle.plateNumber,
        capacityKg: vehicle.capacityKg,
        services: vehicle.services,
        active: vehicle.active,
        approved: vehicle.approved,
      })),
    };
  }

  async getAdminDriverVerification(driverUserId: string) {
    const base = await this.getDriverVerification(driverUserId, { admin: true });
    const events = await this.db
      .select({
        id: verificationEvents.id,
        action: verificationEvents.action,
        reason: verificationEvents.reason,
        actorUserId: verificationEvents.actorUserId,
        documentId: verificationEvents.documentId,
        metadata: verificationEvents.metadata,
        createdAt: verificationEvents.createdAt,
      })
      .from(verificationEvents)
      .where(eq(verificationEvents.driverUserId, driverUserId))
      .orderBy(desc(verificationEvents.createdAt))
      .limit(100);
    return {
      ...base,
      events: events.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
        metadata: this.redactEventMetadata(event.metadata),
      })),
    };
  }

  async uploadDocument(driverUserId: string, type: DocumentType, buffer: Buffer) {
    this.assertDocumentType(type);
    await this.requireProfile(driverUserId);
    const existing = await this.findByType(driverUserId, type);
    const stored = await this.storage.saveDocument(buffer);
    const now = new Date();

    let row: DocumentRow;
    if (existing) {
      const previousKey = existing.storageKey;
      const [updated] = await this.db
        .update(driverDocuments)
        .set({
          storageKey: stored.key,
          mimeType: stored.mimeType,
          byteSize: stored.byteSize,
          status: 'uploaded',
          uploadedAt: now,
          processedAt: null,
          expiresAt: null,
          rejectionReason: null,
          verificationMethod: 'none',
          verifiedAt: null,
          verifiedBy: null,
          extractedData: {},
          updatedAt: now,
        })
        .where(eq(driverDocuments.id, existing.id))
        .returning();
      row = updated;
      await this.storage.delete(previousKey);
      await this.log({
        driverUserId,
        actorUserId: driverUserId,
        documentId: row.id,
        action: 'DOCUMENT_REPLACED',
      });
    } else {
      const [created] = await this.db
        .insert(driverDocuments)
        .values({
          driverUserId,
          type,
          storageKey: stored.key,
          mimeType: stored.mimeType,
          byteSize: stored.byteSize,
          status: 'uploaded',
          uploadedAt: now,
        })
        .returning();
      row = created;
      await this.log({
        driverUserId,
        actorUserId: driverUserId,
        documentId: row.id,
        action: 'DOCUMENT_UPLOADED',
      });
    }

    await this.db
      .update(driverDocuments)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(driverDocuments.id, row.id));
    await this.log({
      driverUserId,
      actorUserId: driverUserId,
      documentId: row.id,
      action: 'DOCUMENT_PROCESSING',
    });
    await this.syncDriverStatus(driverUserId);
    const snapshot = await this.getDriverVerification(driverUserId);
    void this.finalizeUpload(driverUserId, row.id);
    return snapshot;
  }

  private async finalizeUpload(driverUserId: string, documentId: string): Promise<void> {
    try {
      const row = await this.requireDocument(documentId);
      await this.processUploadedDocument(driverUserId, row);
      await this.syncDriverStatus(driverUserId);
    } catch {
      this.logger.warn(`Document processing failed for ${documentId}`);
      await this.db
        .update(driverDocuments)
        .set({
          status: 'needs_review',
          processedAt: new Date(),
          verificationMethod: 'none',
          extractedData: {
            authenticity: {
              result: 'unknown',
              notes: 'Processing failed. External verification provider is not configured.',
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(driverDocuments.id, documentId));
      await this.syncDriverStatus(driverUserId);
    }
  }

  async replaceDocument(driverUserId: string, documentId: string, buffer: Buffer) {
    const row = await this.requireOwnedDocument(driverUserId, documentId);
    return this.uploadDocument(driverUserId, row.type, buffer);
  }

  async openDocumentFile(driverUserId: string, documentId: string, asAdmin = false) {
    const row = asAdmin
      ? await this.requireDocument(documentId)
      : await this.requireOwnedDocument(driverUserId, documentId);
    if (asAdmin && row.driverUserId !== driverUserId) {
      throw new NotFoundException('Document not found');
    }
    return {
      stream: this.storage.openReadStream(row.storageKey),
      mimeType: row.mimeType,
    };
  }

  async approveDocument(adminUserId: string, documentId: string) {
    const row = await this.requireDocument(documentId);
    const effective = this.effectiveDocumentStatus(row);
    if (effective === 'not_submitted') {
      throw new BadRequestException('Document has not been uploaded');
    }
    const now = new Date();
    await this.db
      .update(driverDocuments)
      .set({
        status: 'approved',
        processedAt: now,
        verifiedAt: now,
        verifiedBy: adminUserId,
        verificationMethod: 'manual_review',
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(driverDocuments.id, documentId));
    await this.log({
      driverUserId: row.driverUserId,
      actorUserId: adminUserId,
      documentId,
      action: 'DOCUMENT_APPROVED',
    });
    await this.syncDriverStatus(row.driverUserId);
    return this.getAdminDriverVerification(row.driverUserId);
  }

  async rejectDocument(adminUserId: string, documentId: string, reason: string) {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('Rejection reason is required');
    }
    const row = await this.requireDocument(documentId);
    const now = new Date();
    await this.db
      .update(driverDocuments)
      .set({
        status: 'rejected',
        processedAt: now,
        verifiedAt: now,
        verifiedBy: adminUserId,
        verificationMethod: 'manual_review',
        rejectionReason: trimmed,
        updatedAt: now,
      })
      .where(eq(driverDocuments.id, documentId));
    await this.log({
      driverUserId: row.driverUserId,
      actorUserId: adminUserId,
      documentId,
      action: 'DOCUMENT_REJECTED',
      reason: trimmed,
    });
    await this.syncDriverStatus(row.driverUserId);
    return this.getAdminDriverVerification(row.driverUserId);
  }

  async requestReupload(adminUserId: string, documentId: string, reason: string) {
    const result = await this.rejectDocument(adminUserId, documentId, reason);
    const row = await this.requireDocument(documentId);
    await this.log({
      driverUserId: row.driverUserId,
      actorUserId: adminUserId,
      documentId,
      action: 'REUPLOAD_REQUESTED',
      reason: reason.trim(),
    });
    return result;
  }

  async setDriverReviewStatus(
    adminUserId: string,
    driverUserId: string,
    status: DriverVerificationStatus,
    reason?: string,
  ) {
    const profile = await this.requireProfile(driverUserId);
    if (status === 'approved') {
      await this.assertAdminCanApproveDriver(driverUserId);
    }
    if (status === 'rejected' && (!reason || reason.trim().length < 3)) {
      throw new BadRequestException('Rejection reason is required');
    }
    const forceOffline = status !== 'approved';
    await this.db
      .update(driverProfiles)
      .set({
        verificationStatus: status,
        isOnline: forceOffline ? false : profile.isOnline,
        updatedAt: new Date(),
      })
      .where(eq(driverProfiles.userId, driverUserId));

    const action =
      status === 'approved'
        ? 'DRIVER_APPROVED'
        : status === 'rejected'
          ? 'DRIVER_REJECTED'
          : status === 'suspended'
            ? 'DRIVER_SUSPENDED'
            : profile.verificationStatus === 'suspended'
              ? 'DRIVER_REACTIVATED'
              : undefined;
    if (action) {
      await this.log({
        driverUserId,
        actorUserId: adminUserId,
        action,
        reason: reason?.trim() || undefined,
      });
    }
    return this.getAdminDriverVerification(driverUserId);
  }

  async evaluateEligibility(driverUserId: string): Promise<DriverEligibility> {
    const profile = await this.requireProfile(driverUserId);
    const [person] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, driverUserId))
      .limit(1);
    const docs = await this.currentRequiredDocuments(driverUserId);
    const [vehicle] = await this.db
      .select()
      .from(driverVehicles)
      .where(
        and(eq(driverVehicles.driverUserId, driverUserId), eq(driverVehicles.active, true)),
      )
      .limit(1);

    const blockers: EligibilityBlocker[] = [];
    const profileComplete = Boolean(person?.firstName?.trim() && person?.lastName?.trim());
    const requiredApproved = docs.every(
      (doc) => doc != null && this.effectiveDocumentStatus(doc) === 'approved',
    );
    const vehicleApproved = Boolean(vehicle?.approved && vehicle.active);

    if (profile.verificationStatus === 'suspended') {
      blockers.push('DRIVER_SUSPENDED');
    }
    if (!profileComplete) {
      blockers.push('PROFILE_INCOMPLETE');
    }
    if (docs.some((doc) => !doc)) {
      blockers.push('DOCUMENTS_INCOMPLETE');
    } else {
      if (docs.some((doc) => this.effectiveDocumentStatus(doc!) === 'expired')) {
        blockers.push('DOCUMENT_EXPIRED');
      }
      if (docs.some((doc) => this.effectiveDocumentStatus(doc!) === 'rejected')) {
        blockers.push('DOCUMENT_REJECTED');
      }
      if (!requiredApproved) {
        blockers.push('DOCUMENTS_NOT_APPROVED');
      }
    }
    if (!vehicleApproved) {
      blockers.push('VEHICLE_NOT_APPROVED');
    }
    if (profile.verificationStatus !== 'approved') {
      blockers.push('DRIVER_NOT_APPROVED');
    }

    return {
      canGoOnline: blockers.length === 0,
      blockers: [...new Set(blockers)],
      requiredApproved,
      vehicleApproved,
      profileComplete,
    };
  }

  async assertCanGoOnline(driverUserId: string): Promise<void> {
    const eligibility = await this.evaluateEligibility(driverUserId);
    if (eligibility.canGoOnline) {
      return;
    }
    if (eligibility.blockers.includes('DRIVER_SUSPENDED')) {
      throw new ForbiddenException('Driver is suspended');
    }
    if (eligibility.blockers.includes('DOCUMENT_EXPIRED')) {
      throw new ForbiddenException('Required documents are expired');
    }
    if (eligibility.blockers.includes('DOCUMENTS_INCOMPLETE')) {
      throw new ForbiddenException('Required documents are missing');
    }
    if (eligibility.blockers.includes('DOCUMENTS_NOT_APPROVED')) {
      throw new ForbiddenException('Required documents are not approved');
    }
    throw new ForbiddenException('Driver is not approved');
  }

  async assertAdminCanApproveDriver(driverUserId: string): Promise<void> {
    const eligibility = await this.evaluateEligibility(driverUserId);
    if (!eligibility.profileComplete) {
      throw new BadRequestException('Driver profile is incomplete');
    }
    if (!eligibility.requiredApproved) {
      throw new BadRequestException('All required documents must be approved first');
    }
    if (eligibility.blockers.includes('DOCUMENT_EXPIRED')) {
      throw new BadRequestException('One or more documents are expired');
    }
    if (!eligibility.vehicleApproved) {
      throw new BadRequestException('Driver vehicle is not approved');
    }
  }

  async syncDriverStatus(driverUserId: string): Promise<void> {
    const profile = await this.requireProfile(driverUserId);
    if (profile.verificationStatus === 'suspended') {
      return;
    }
    const next = await this.deriveDriverStatus(driverUserId, profile.verificationStatus);
    if (next === profile.verificationStatus) {
      return;
    }
    const forceOffline = next !== 'approved';
    await this.db
      .update(driverProfiles)
      .set({
        verificationStatus: next,
        isOnline: forceOffline ? false : profile.isOnline,
        updatedAt: new Date(),
      })
      .where(eq(driverProfiles.userId, driverUserId));
  }

  private async deriveDriverStatus(
    driverUserId: string,
    current: DriverVerificationStatus,
  ): Promise<DriverVerificationStatus> {
    const docs = await this.currentRequiredDocuments(driverUserId);
    const statuses = docs.map((doc) => (doc ? this.effectiveDocumentStatus(doc) : 'not_submitted'));
    if (statuses.some((status) => status === 'expired')) {
      return 'expired';
    }
    if (statuses.some((status) => status === 'rejected')) {
      return current === 'approved' ? 'rejected' : 'rejected';
    }
    if (statuses.some((status) => status === 'not_submitted')) {
      return current === 'approved' ? 'incomplete' : 'incomplete';
    }
    if (statuses.some((status) => status === 'processing' || status === 'uploaded')) {
      return 'under_review';
    }
    if (statuses.every((status) => status === 'approved')) {
      return current === 'approved' ? 'approved' : 'pending_verification';
    }
    if (statuses.every((status) => status === 'needs_review' || status === 'approved')) {
      return current === 'approved' ? 'under_review' : 'pending_verification';
    }
    return 'under_review';
  }

  private async processUploadedDocument(driverUserId: string, row: DocumentRow): Promise<void> {
    const result = await this.provider.verify({
      type: row.type,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
    });

    const [person] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, driverUserId))
      .limit(1);
    const profileName = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
    const extractedName = result.extraction.fullName?.trim() ?? '';
    const mismatch =
      Boolean(extractedName) &&
      Boolean(profileName) &&
      this.normalizeName(extractedName) !== this.normalizeName(profileName);

    const expiresAt = this.parseExpiry(result.extraction.expiresAt);
    const expired = Boolean(expiresAt && expiresAt.getTime() < Date.now());

    let duplicate = false;
    const documentNumber = result.extraction.documentNumber?.trim();
    if (documentNumber) {
      const others = await this.db
        .select({
          id: driverDocuments.id,
          extractedData: driverDocuments.extractedData,
        })
        .from(driverDocuments)
        .where(
          and(ne(driverDocuments.driverUserId, driverUserId), eq(driverDocuments.type, row.type)),
        );
      duplicate = others.some((item) => {
        const extracted = item.extractedData as { extraction?: { documentNumber?: string } };
        return this.normalizeName(extracted.extraction?.documentNumber ?? '') === this.normalizeName(documentNumber);
      });
    }

    const extractedData: Record<string, unknown> = {
      extraction: result.extraction,
      authenticity: result.authenticity,
      providerId: result.providerId,
      providerConfigured: result.configured,
      profileMismatch: mismatch,
      duplicateSuspect: duplicate,
    };

    const nextStatus: DocumentStatus = expired ? 'expired' : 'needs_review';
    const rejectionReason = mismatch
      ? 'Дані документа не збігаються з даними профілю.'
      : expired
        ? 'Документ прострочений'
        : null;

    await this.db
      .update(driverDocuments)
      .set({
        status: nextStatus,
        processedAt: new Date(),
        expiresAt,
        extractedData,
        verificationMethod: 'none',
        rejectionReason,
        verifiedAt: null,
        verifiedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(driverDocuments.id, row.id));

    if (expired) {
      await this.log({
        driverUserId,
        actorUserId: null,
        documentId: row.id,
        action: 'DOCUMENT_EXPIRED',
        reason: rejectionReason ?? undefined,
      });
    }
  }

  effectiveDocumentStatus(row: DocumentRow): DocumentStatus {
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return 'expired';
    }
    return row.status;
  }

  private async currentRequiredDocuments(driverUserId: string): Promise<Array<DocumentRow | null>> {
    const rows = await this.db
      .select()
      .from(driverDocuments)
      .where(eq(driverDocuments.driverUserId, driverUserId));
    const byType = new Map(rows.map((row) => [row.type, row]));
    return REQUIRED.map((type) => byType.get(type) ?? null);
  }

  private async findByType(driverUserId: string, type: DocumentType) {
    const [row] = await this.db
      .select()
      .from(driverDocuments)
      .where(and(eq(driverDocuments.driverUserId, driverUserId), eq(driverDocuments.type, type)))
      .limit(1);
    return row;
  }

  private async requireDocument(documentId: string) {
    const [row] = await this.db
      .select()
      .from(driverDocuments)
      .where(eq(driverDocuments.id, documentId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Document not found');
    }
    return row;
  }

  private async requireOwnedDocument(driverUserId: string, documentId: string) {
    const row = await this.requireDocument(documentId);
    if (row.driverUserId !== driverUserId) {
      throw new ForbiddenException('Document does not belong to this driver');
    }
    return row;
  }

  private async requireProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);
    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }
    return profile;
  }

  private assertDocumentType(type: string): asserts type is DocumentType {
    if (!(REQUIRED as readonly string[]).includes(type)) {
      throw new BadRequestException('Unknown document type');
    }
  }

  private parseExpiry(value?: string): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private redactEventMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const clone = { ...metadata };
    delete clone.extractedData;
    delete clone.documentNumber;
    delete clone.fullName;
    delete clone.dateOfBirth;
    return clone;
  }

  private async log(input: {
    driverUserId: string;
    actorUserId: string | null;
    documentId?: string | null;
    action:
      | 'DOCUMENT_UPLOADED'
      | 'DOCUMENT_PROCESSING'
      | 'DOCUMENT_APPROVED'
      | 'DOCUMENT_REJECTED'
      | 'DOCUMENT_REPLACED'
      | 'DOCUMENT_EXPIRED'
      | 'DRIVER_APPROVED'
      | 'DRIVER_REJECTED'
      | 'DRIVER_SUSPENDED'
      | 'DRIVER_REACTIVATED'
      | 'REUPLOAD_REQUESTED';
    reason?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.db.insert(verificationEvents).values({
      driverUserId: input.driverUserId,
      actorUserId: input.actorUserId,
      documentId: input.documentId ?? null,
      action: input.action,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
    });
  }
}
