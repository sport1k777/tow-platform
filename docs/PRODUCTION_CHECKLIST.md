# Production launch checklist

## MVP READY (this repository)

- Phone OTP auth with Ukrainian numbering, expiry, attempt limits, refresh rotation
- Customer create-order flow (map, details, quote, confirm, history, tracking poll)
- Driver online/offline, offers, accept/reject, status progression, profile
- Admin dashboard from live API data (orders, drivers, pricing, export)
- PostGIS locations and nearest-driver matching
- Server-authoritative pricing
- Provider interfaces for SMS, maps, notifications
- Automated API unit + e2e tests for auth, pricing, orders, matching, roles
- Seed users for local QA

## PRODUCTION REQUIRED (do not launch publicly without these)

- [ ] Set `AUTH_OTP_MODE=sms` (never `mock`) and replace `SMS_PROVIDER=dev` with Twilio / Vonage / a Ukrainian SMS gateway
- [ ] Replace `NOTIFICATION_PROVIDER=dev` with push (APNs/FCM) and optional email/WhatsApp
- [ ] Decide production maps: keep OSM or add Google/Mapbox keys + ToS/billing
- [ ] TLS everywhere; rotate `JWT_SECRET`; disable `CORS_ORIGINS=*`
- [ ] Hosted PostgreSQL backups and PostGIS
- [ ] Rate limiting at the reverse proxy; abuse monitoring on OTP
- [ ] Payment gateway (not in MVP)
- [ ] Privacy policy, user terms, App Store / Play listing
- [ ] Production EAS/iOS certificates and a store build (not a dev client)
- [ ] Crash/analytics (optional, paid) after legal review
- [ ] Connect an external document verification/OCR provider if required; the current flow is authenticated upload + manual admin review (documents are never auto-approved)
- [ ] Real-time location transport (WebSocket) if live tracking is a launch promise
- [ ] Load test matching + order accept under concurrent drivers

Until the items above are done, the product is **MVP-ready for internal testing**, not production-ready.
