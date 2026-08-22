# API

Base URL (development): `http://127.0.0.1:3001`

All JSON errors use `{ "statusCode", "message" }` via the global exception filter. Authenticated routes require `Authorization: Bearer <accessToken>`.

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | no | Body `{ phone }`. When `AUTH_OTP_MODE=mock` (development/test only) the response includes `otpMode: "mock"` and `devCode`. Production `AUTH_OTP_MODE=sms` never returns a code. |
| POST | `/auth/otp/verify` | no | `{ phone, code, role? }`. Optional `role` is `customer` (default) or `driver`. `driver` keeps the customer role, adds `driver`, and creates an `incomplete` profile. Does not grant admin. |
| POST | `/auth/refresh` | no | Rotates refresh token; reloads roles |
| POST | `/auth/logout` | yes | Revokes the presented refresh token |
| GET | `/me` | yes | `phone`, `displayName`, `roles`, `canUseDriverMode`, `canUseAdminMode` |

## Users

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/users/me` | any logged-in user. Returns `firstName`, `lastName`, `hasAvatar`, `displayName`, `phone`, `roles`. |
| PATCH | `/users/me` | `{ firstName?, lastName?, displayName? }` |
| POST | `/users/me/avatar` | multipart field `file` (JPEG/PNG/WEBP) |
| DELETE | `/users/me/avatar` | |
| GET | `/users/me/avatar` | authenticated image stream; not a public URL |

## Drivers / vehicles

| Method | Path | Role |
| --- | --- | --- |
| GET | `/drivers/me` | driver. Includes `canGoOnline`, `blockers`, `firstName`, `lastName`, `hasAvatar`, vehicle `make`/`model`/`approved`. |
| POST | `/drivers/me/presence` | approved driver with required documents + approved vehicle `{ online, lat?, lng? }` |
| GET | `/drivers/me/verification` | driver. Document statuses from the database. Never auto-approved. |
| POST | `/drivers/me/documents` | multipart `file` + `type` |
| POST | `/drivers/me/documents/:id/replace` | multipart `file` |
| GET | `/drivers/me/documents/:id/file` | authenticated stream of the driver's own document |
| GET | `/driver/offers/current` | approved driver |
| POST | `/driver/offers/:id/accept` | approved driver |
| POST | `/driver/offers/:id/reject` | approved driver |

Vehicle fields are returned on `/drivers/me` (`plateNumber`, `capacityKg`, `vehicleCategory`, `services`).

## Quotes / maps / pricing

| Method | Path | Role |
| --- | --- | --- |
| POST | `/quotes` | customer. Server-side price. Optional `details.notes`. |
| GET | `/service-types` | authenticated |
| POST | `/geo/geocode` | authenticated `{ query }` |
| POST | `/geo/reverse` | authenticated `{ lat, lng }` |
| POST | `/geo/route` | authenticated `{ origin, destination }` |

There is no client-authoritative price endpoint. Admin writes rules at `/admin/pricing`.

## Orders

| Method | Path | Role |
| --- | --- | --- |
| POST | `/orders` | customer `{ quoteId }` |
| GET | `/orders` | customer history |
| GET | `/orders/driver/active` | driver (in-progress jobs) |
| GET | `/orders/:id` | customer, assigned driver, or admin |
| POST | `/orders/:id/cancel` | customer or assigned driver (allowed statuses) |
| POST | `/orders/:id/en-route` | assigned driver |
| POST | `/orders/:id/arrive` | assigned driver |
| POST | `/orders/:id/start` | assigned driver |
| POST | `/orders/:id/complete` | assigned driver |

Statuses: `searching`, `offered`, `accepted`, `driver_en_route`, `arrived`, `in_progress`, `completed`, `cancelled`, `expired`.

## Notifications

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/notifications` | current user inbox (dev/provider rows) |

## Admin

Role `admin` required.

| Method | Path |
| --- | --- |
| GET | `/admin/stats` |
| GET | `/admin/orders?status=` |
| GET | `/admin/orders/:id` |
| POST | `/admin/orders/:id/status` `{ status, reason }` |
| GET | `/admin/orders/export` `{ csv }` |
| GET | `/admin/users` |
| GET | `/admin/drivers` |
| GET | `/admin/drivers/:id/verification` |
| GET | `/admin/drivers/:id/avatar` |
| GET | `/admin/drivers/:id/documents/:documentId/file` |
| POST | `/admin/drivers/:id/status` `{ verificationStatus, reason? }` (`rejected` requires reason; `approved` requires all required documents + approved vehicle + complete profile) |
| POST | `/admin/documents/:id/approve` |
| POST | `/admin/documents/:id/reject` `{ reason }` |
| POST | `/admin/documents/:id/reupload` `{ reason }` |
| GET | `/admin/pricing` |
| POST | `/admin/pricing` |

Allowed admin status overrides: `cancelled`, `expired`, `completed`, `searching` (completed still must be a valid transition).

## Health

| Method | Path |
| --- | --- |
| GET | `/health` |
| GET | `/health/ready` |
