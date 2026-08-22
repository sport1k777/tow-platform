import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['customer', 'driver', 'admin']);

export const serviceKeyEnum = pgEnum('service_key', [
  'tow',
  'moving',
  'cargo',
  'roadside',
]);

export const destinationPolicyEnum = pgEnum('destination_policy', [
  'required',
  'optional',
]);

export const vehicleCategoryEnum = pgEnum('vehicle_category', [
  'car',
  'suv',
  'van',
  'truck',
  'motorcycle',
]);

export const pickupSourceEnum = pgEnum('pickup_source', [
  'manual_address',
  'current_location',
  'map_pin',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'searching',
  'offered',
  'accepted',
  'driver_en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
]);

export const offerStatusEnum = pgEnum('offer_status', [
  'pending',
  'accepted',
  'rejected',
  'expired',
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'incomplete',
  'pending_verification',
  'under_review',
  'approved',
  'rejected',
  'suspended',
  'expired',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'drivers_license',
  'identity',
  'vehicle_registration',
  'insurance',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'not_submitted',
  'uploaded',
  'processing',
  'needs_review',
  'approved',
  'rejected',
  'expired',
]);

export const verificationEventActionEnum = pgEnum('verification_event_action', [
  'DOCUMENT_UPLOADED',
  'DOCUMENT_PROCESSING',
  'DOCUMENT_APPROVED',
  'DOCUMENT_REJECTED',
  'DOCUMENT_REPLACED',
  'DOCUMENT_EXPIRED',
  'DRIVER_APPROVED',
  'DRIVER_REJECTED',
  'DRIVER_SUSPENDED',
  'DRIVER_REACTIVATED',
  'REUPLOAD_REQUESTED',
]);

export const verificationMethodEnum = pgEnum('verification_method', [
  'none',
  'manual_review',
  'external_provider',
]);

export const cancelledByEnum = pgEnum('cancelled_by', ['customer', 'driver', 'admin']);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'dev',
  'sms',
  'push',
  'email',
  'whatsapp',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
]);

/** PostGIS geography point. Writes use ST_MakePoint via `geographyFromLngLat`. */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Point,4326)';
  },
});

export function geographyFromLngLat(lng: number, lat: number) {
  return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').unique(),
  displayName: text('display_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarStorageKey: text('avatar_storage_key'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('refresh_tokens_user_expires_idx').on(table.userId, table.expiresAt),
  ],
);

export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('otp_challenges_phone_created_idx').on(table.phone, table.createdAt),
    index('otp_challenges_expires_idx').on(table.expiresAt),
  ],
);

export const serviceTypes = pgTable('service_types', {
  key: serviceKeyEnum('key').primaryKey(),
  destinationPolicy: destinationPolicyEnum('destination_policy').notNull(),
  active: boolean('active').notNull().default(true),
});

export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceKey: serviceKeyEnum('service_key')
      .notNull()
      .references(() => serviceTypes.key),
    cityCode: text('city_code'),
    vehicleCategory: vehicleCategoryEnum('vehicle_category'),
    optionKey: text('option_key'),
    baseFeeKopiyky: integer('base_fee_kopiyky').notNull(),
    perKmKopiyky: integer('per_km_kopiyky').notNull(),
    minFeeKopiyky: integer('min_fee_kopiyky').notNull(),
    nightMultiplierBps: integer('night_multiplier_bps').notNull().default(10000),
    weekendMultiplierBps: integer('weekend_multiplier_bps').notNull().default(10000),
    config: jsonb('config')
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    active: boolean('active').notNull().default(true),
    validFrom: timestamp('valid_from', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('pricing_rules_lookup_idx').on(
      table.serviceKey,
      table.cityCode,
      table.vehicleCategory,
      table.optionKey,
      table.active,
      table.validFrom.desc(),
    ),
    check('pricing_rules_base_fee_nonneg', sql`${table.baseFeeKopiyky} >= 0`),
    check('pricing_rules_per_km_nonneg', sql`${table.perKmKopiyky} >= 0`),
    check('pricing_rules_min_fee_nonneg', sql`${table.minFeeKopiyky} >= 0`),
  ],
);

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    serviceKey: serviceKeyEnum('service_key').notNull(),
    vehicleCategory: vehicleCategoryEnum('vehicle_category'),
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    pickupLabel: text('pickup_label').notNull(),
    pickupLocation: geographyPoint('pickup_location').notNull(),
    pickupSource: pickupSourceEnum('pickup_source').notNull().default('manual_address'),
    destinationLabel: text('destination_label'),
    destinationLocation: geographyPoint('destination_location'),
    distanceMeters: integer('distance_meters').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    pricingRuleId: uuid('pricing_rule_id').references(() => pricingRules.id),
    amountKopiyky: integer('amount_kopiyky').notNull(),
    currency: text('currency').notNull().default('UAH'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('quotes_customer_created_idx').on(
      table.customerId,
      table.createdAt.desc(),
    ),
    index('quotes_expires_idx').on(table.expiresAt),
    check('quotes_amount_nonneg', sql`${table.amountKopiyky} >= 0`),
    check('quotes_distance_nonneg', sql`${table.distanceMeters} >= 0`),
    check('quotes_duration_nonneg', sql`${table.durationSeconds} >= 0`),
  ],
);

export const driverProfiles = pgTable('driver_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  verificationStatus: verificationStatusEnum('verification_status')
    .notNull()
    .default('incomplete'),
  isOnline: boolean('is_online').notNull().default(false),
  lastLocation: geographyPoint('last_location'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  completedOrdersCount: integer('completed_orders_count').notNull().default(0),
  ratingSum: integer('rating_sum').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const driverVehicles = pgTable(
  'driver_vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    driverUserId: uuid('driver_user_id')
      .notNull()
      .references(() => driverProfiles.userId, { onDelete: 'cascade' }),
    vehicleCategory: vehicleCategoryEnum('vehicle_category').notNull(),
    plateNumber: text('plate_number'),
    make: text('make'),
    model: text('model'),
    year: integer('year'),
    capacityKg: integer('capacity_kg'),
    services: serviceKeyEnum('services').array().notNull(),
    active: boolean('active').notNull().default(true),
    approved: boolean('approved').notNull().default(false),
  },
  (table) => [
    index('driver_vehicles_driver_idx').on(table.driverUserId),
    check(
      'driver_vehicles_services_nonempty',
      sql`cardinality(${table.services}) > 0`,
    ),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    driverId: uuid('driver_id').references(() => users.id),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id)
      .unique(),
    serviceKey: serviceKeyEnum('service_key').notNull(),
    vehicleCategory: vehicleCategoryEnum('vehicle_category'),
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    pickupLabel: text('pickup_label').notNull(),
    pickupLocation: geographyPoint('pickup_location').notNull(),
    pickupSource: pickupSourceEnum('pickup_source').notNull().default('manual_address'),
    destinationLabel: text('destination_label'),
    destinationLocation: geographyPoint('destination_location'),
    distanceMeters: integer('distance_meters').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    pricingRuleId: uuid('pricing_rule_id').references(() => pricingRules.id),
    amountKopiyky: integer('amount_kopiyky').notNull(),
    currency: text('currency').notNull().default('UAH'),
    status: orderStatusEnum('status').notNull(),
    searchExpiresAt: timestamp('search_expires_at', {
      withTimezone: true,
    }).notNull(),
    cancelledBy: cancelledByEnum('cancelled_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('orders_customer_created_idx').on(
      table.customerId,
      table.createdAt.desc(),
    ),
    index('orders_driver_status_idx').on(table.driverId, table.status),
    index('orders_status_search_expires_idx').on(
      table.status,
      table.searchExpiresAt,
    ),
    check('orders_amount_nonneg', sql`${table.amountKopiyky} >= 0`),
    check('orders_distance_nonneg', sql`${table.distanceMeters} >= 0`),
    check('orders_duration_nonneg', sql`${table.durationSeconds} >= 0`),
  ],
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: orderStatusEnum('from_status'),
    toStatus: orderStatusEnum('to_status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('order_status_history_order_idx').on(table.orderId, table.createdAt)],
);

export const orderOffers = pgTable(
  'order_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => users.id),
    status: offerStatusEnum('status').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('order_offers_one_pending_per_order_idx')
      .on(table.orderId)
      .where(sql`${table.status} = 'pending'`),
    uniqueIndex('order_offers_one_pending_per_driver_idx')
      .on(table.driverId)
      .where(sql`${table.status} = 'pending'`),
    index('order_offers_driver_status_idx').on(table.driverId, table.status),
    index('order_offers_pending_expires_idx')
      .on(table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' })
      .unique(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id),
    score: integer('score').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('ratings_to_user_idx').on(table.toUserId),
    check('ratings_score_range', sql`${table.score} >= 1 AND ${table.score} <= 5`),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: notificationStatusEnum('status').notNull().default('queued'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (table) => [index('notifications_user_created_idx').on(table.userId, table.createdAt.desc())],
);

export const driverDocuments = pgTable(
  'driver_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    driverUserId: uuid('driver_user_id')
      .notNull()
      .references(() => driverProfiles.userId, { onDelete: 'cascade' }),
    type: documentTypeEnum('type').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    status: documentStatusEnum('status').notNull().default('uploaded'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    verificationMethod: verificationMethodEnum('verification_method')
      .notNull()
      .default('none'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    extractedData: jsonb('extracted_data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('driver_documents_driver_type_idx').on(table.driverUserId, table.type),
    index('driver_documents_status_idx').on(table.status),
  ],
);

export const verificationEvents = pgTable(
  'verification_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    driverUserId: uuid('driver_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => driverDocuments.id, {
      onDelete: 'set null',
    }),
    action: verificationEventActionEnum('action').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('verification_events_driver_idx').on(table.driverUserId, table.createdAt.desc()),
    index('verification_events_document_idx').on(table.documentId, table.createdAt.desc()),
  ],
);

export const schema = {
  users,
  userRoles,
  refreshTokens,
  userRoleEnum,
  otpChallenges,
  serviceKeyEnum,
  destinationPolicyEnum,
  vehicleCategoryEnum,
  orderStatusEnum,
  offerStatusEnum,
  verificationStatusEnum,
  documentTypeEnum,
  documentStatusEnum,
  verificationEventActionEnum,
  verificationMethodEnum,
  cancelledByEnum,
  notificationChannelEnum,
  notificationStatusEnum,
  serviceTypes,
  pricingRules,
  quotes,
  driverProfiles,
  driverVehicles,
  driverDocuments,
  verificationEvents,
  orders,
  orderStatusHistory,
  orderOffers,
  ratings,
  notifications,
};
