# Deployment

## Development (this repo)

1. `docker compose up -d postgres`
2. `cd api && npm install && npm run db:migrate && npm run db:seed && npm run start:dev`
3. From repo root: `npm install && npx expo start --dev-client --scheme towplatform`
4. iOS device: `npx expo run:ios --device <UDID> --no-build-cache --no-bundler`

API default port is **3001**. Do not bind the Expo CLI from the `api/` directory.

## Production topology (not wired in this MVP)

Suggested split:

- Managed PostgreSQL 16 with PostGIS
- API as a container or Node process behind TLS
- Mobile store builds with `eas build` / Xcode archive
- Secrets from a vault or host env, never from git

Required production env (see `api/src/config/env.ts`):

- `NODE_ENV=production`
- `AUTH_OTP_MODE=sms` (never `mock`)
- `DATABASE_URL` (TLS)
- `JWT_SECRET` (≥32 random chars)
- `SMS_PROVIDER` **not** `dev`
- `NOTIFICATION_PROVIDER` **not** `dev`
- `VERIFICATION_MODE=manual` (never `mock`)
- `UPLOAD_DIR` a private disk path, not a public web root
- `GEO_PROVIDER` (`osm` is acceptable until a commercial maps contract exists)
- `CORS_ORIGINS` explicit origins, not `*`
- `EXPO_PUBLIC_API_URL` HTTPS API

## Migrations

Run `npm run db:migrate` from `api/` against the target database. Migrations live in `api/drizzle/`. Do not drop development data unless you intend to.

## Android

`app.json` includes an Android package (`com.anonymous.towplatform`) and location permissions. Android is not the current test target; business logic is not iOS-only.

## iOS

Development builds use `expo-dev-client` and the `towplatform` URL scheme. Store submission, push certificates, and a production maps SDK are out of scope until paid services are connected.
