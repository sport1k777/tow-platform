# API

Base URL (development): `http://127.0.0.1:3001`

All JSON errors use `{ "statusCode", "message" }` via the global exception filter. Authenticated routes require `Authorization: Bearer <accessToken>`.

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | no | Body `{ phone }`. Non-production returns `devCode`. |
| POST | `/auth/otp/verify` | no | `{ phone, code }` → token pair |
| POST | `/auth/refresh` | no | Rotates refresh token; reloads roles |
| POST | `/auth/logout` | yes | Revokes the presented refresh token |
| GET | `/me` | yes | `phone`, `displayName`, `roles`, `canUseDriverMode`, `canUseAdminMode` |

## Users

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/users/me` | any logged-in user |
| PATCH | `/users/me` | `{ displayName }` |

## Drivers / vehicles

| Method | Path | Role |
| --- | --- | --- |
| GET | `/drivers/me` | driver |
| POST | `/drivers/me/presence` | approved driver `{ online, lat?, lng? }` |
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
| POST | `/admin/drivers/:id/status` `{ verificationStatus }` |
| GET | `/admin/pricing` |
| POST | `/admin/pricing` |

Allowed admin status overrides: `cancelled`, `expired`, `completed`, `searching` (completed still must be a valid transition).

## Health

| Method | Path |
| --- | --- |
| GET | `/health` |
| GET | `/health/ready` |
