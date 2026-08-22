# Tow Platform

Ukrainian tow-truck marketplace MVP. One Expo app (customer, driver, admin) talks to a NestJS API on PostgreSQL + PostGIS.

This MVP is **functionally complete without paid third-party services**. SMS, maps, push, and payments are abstracted behind development providers.

## Architecture

- Mobile: Expo SDK 57, Expo Router, TypeScript, `expo-dev-client`
- API: NestJS, Drizzle ORM, PostgreSQL 16 + PostGIS
- Auth: choose client or driver first, then Ukrainian phone OTP (`+380` + 9 digits), JWT access + rotating refresh tokens (SecureStore on device)
- Geo: `GeoProvider` (`dev` or free OSM/OSRM)
- Notifications: `NotificationProvider` (`dev` logs + DB rows)
- SMS: `SmsProvider` behind `AUTH_OTP_MODE` (`mock` in development, `sms` required in production)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API.md](docs/API.md).

## Requirements

- Node.js 20+
- Docker (Postgres)
- Xcode (for a physical iPhone development build)

## Environment

Copy examples, then edit secrets locally. **Never commit `api/.env`.**

```bash
cp api/.env.example api/.env
cp .env.example .env
```

| Variable | Purpose | MVP default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres | `postgresql://tow:tow@localhost:5433/tow_platform` |
| `JWT_SECRET` | Access/refresh/OTP HMAC | ≥32 chars, local only |
| `PORT` | API port | `3001` (must match the mobile API URL) |
| `AUTH_OTP_MODE` | OTP delivery | `mock` in development. Production **must** be `sms`. |
| `SMS_PROVIDER` | Real SMS adapter | `dev` (blocked in production; no paid gateway in this MVP) |
| `GEO_PROVIDER` | Geocode/route | `dev` (or `osm` for free Nominatim/OSRM) |
| `NOTIFICATION_PROVIDER` | Outbound notices | `dev` |
| `EXPO_PUBLIC_API_URL` | Mobile API base | Simulator: `http://127.0.0.1:3001`. Physical device: your Mac's LAN URL or a tunnel. Do not hardcode IPs in source. |

`AUTH_OTP_MODE=mock`, `SMS_PROVIDER=dev`, and `NOTIFICATION_PROVIDER=dev` are **blocked in production**. Production requires `AUTH_OTP_MODE=sms`.

## Database

```bash
docker compose up -d postgres
cd api
npm install
npm run db:migrate
npm run db:seed
```

Postgres is published on host port **5433**.

## API

```bash
cd api
npm run start:dev
```

Health: `GET http://127.0.0.1:3001/health`

## Mobile

Always start Expo from the **repository root**, never from `api/`.

```bash
npm install
npx expo start --dev-client --scheme towplatform
```

Physical iPhone without USB/LAN Metro: `npm run start:tunnel`.

On a physical iPhone, the app uses the Mac LAN IP from Metro (not `localhost` / `127.0.0.1`). Optional override: `EXPO_PUBLIC_API_URL=http://<Mac-LAN-IP>:3001`.

## iOS development build

This app requires a real Expo development build (`expo-dev-client`). Expo Go is not used.

```bash
npx expo prebuild --platform ios
npx expo run:ios --device 00008150-00063D061112401C --no-build-cache --no-bundler
```

Then start Metro from the repo root. The phone must be unlocked and CoreDevice-online (USB).

Team ID: `X53JZ35W8H`. Bundle ID: `com.anonymous.tow-platform`.

## Test credentials (development seed)

Dev OTP (`AUTH_OTP_MODE=mock`) is returned as `devCode` from `POST /auth/otp/request` and shown in the development UI. This is never enabled in production.

| Phone | Role |
| --- | --- |
| `+380501111111` | Customer |
| `+380502222222` | Approved driver (Kyiv) |
| `+380503333333` | Approved driver (Lviv) |
| `+380509999999` | Admin |

Enter **9 digits** after `+380` in the app (example: `501111111`).

## Tests

```bash
cd api
npm run test:unit
npm test
npm run typecheck
npm run lint

cd ..
npm run typecheck
npm run lint
```

## Troubleshooting

- QR opens `http://localhost:...` in Safari: Metro was started from `api/` or this is not a dev-client build. Start Expo from the repo root with `--dev-client --scheme towplatform`.
- API unreachable on a physical iPhone: `localhost` is the phone itself. Set `EXPO_PUBLIC_API_URL` to the Mac LAN IP or use a tunnel.
- `No device UDID matching`: iPhone is offline in Xcode / CoreDevice. Plug in, unlock, trust the computer.
- JWT/admin role missing after promoting a user: refresh the session or log in again (roles are embedded in the access token and refreshed from the database).

## Production services still required

See [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
