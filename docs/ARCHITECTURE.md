# Architecture

Tow Platform is a Ukraine-first marketplace: customers request tow / roadside / moving / cargo jobs; approved drivers accept and complete them; admins configure pricing and verification.

## Runtime split

| Layer | Stack |
| --- | --- |
| Mobile | Expo SDK 57, React Native 0.86, Expo Router, TypeScript |
| API | NestJS 11, class-validator DTOs, JWT guards, role guards |
| Data | PostgreSQL 16 + PostGIS, Drizzle ORM |
| Local infra | Docker Compose Postgres on host port 5433 |

One Expo binary serves three modes gated by roles: customer (default), driver (`canUseDriverMode`), admin (`canUseAdminMode`).

## Market defaults

`api/src/config/market.ts` and `src/phone/ua.ts` encode Ukraine defaults (locale `uk-UA`, currency UAH, phone `+380`). Service keys and copy can be extended later for other countries; do not scatter extra Ukraine-only branches through UI components.

## Auth

1. Customer enters 9 Ukrainian mobile digits. The client formats `XX XXX XX XX` and sends E.164 `+380XXXXXXXXX`.
2. `POST /auth/otp/request` stores a hashed OTP, enforces resend windows and attempt caps.
3. `SmsProvider` sends the code. The `dev` provider does not call a network SMS API; the API returns `devCode` outside production.
4. Verify issues a short-lived JWT access token and a rotating refresh token stored in **expo-secure-store** (not AsyncStorage).
5. Roles live on `user_roles`. Access tokens embed roles; `/auth/refresh` reloads roles from the database.

## Orders

Statuses: `searching → offered → accepted → driver_en_route → arrived → in_progress → completed`, plus `cancelled` / `expired`.

Transitions are enforced in `api/src/orders/order-state.ts`. Matching offers the nearest eligible online approved driver (PostGIS distance). Accept uses a row lock + `UPDATE … WHERE status = 'offered'` so two drivers cannot both win.

Customer tracking polls `GET /orders/:id` every 3s while the job is open (websocket-ready; no fake live GPS layer).

## Pricing

`PricingService` loads active `pricing_rules`. `calculateAmountKopiyky` applies base, per-km, minimum, and optional night/weekend multipliers (Europe/Kyiv). Quotes persist the amount; orders copy that amount. The UI never invents a price.

## Maps

`GeoProvider`:

- `geocode` / `reverse` / `route` (distance + duration)

Implementations:

- `dev` — deterministic Ukraine points, no paid key
- `osm` — Nominatim + public OSRM

Replace later with Google/Mapbox by adding a provider and setting `GEO_PROVIDER`. HTTP surface is `/geo/*`.

## Notifications

`NotificationProvider` (SMS / push / email / WhatsApp channels in the type). `dev` writes `notifications` rows and logs. Matching notifies the offered driver through this interface.

## Drivers

Availability is derived:

- `suspended` — verification status
- `busy` — active job (`accepted` … `in_progress`)
- `online` / `offline` — `is_online` flag plus last PostGIS location

Admin approves or suspends; there is no KYC flow in this MVP.
