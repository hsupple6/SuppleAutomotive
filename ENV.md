# Supple Automotive — Environment / Config Reference

This document lists all configurable values used across the website. Edit `config.js` to update; the site reads from `window.SUPPLE_CONFIG`.

## config.js (browser)

| Key | Description | Example |
|-----|-------------|---------|
| `businessName` | Legal or display name of the business | `"Supple Automotive"` |
| `phone` | Primary contact phone (display format); form submissions are texted here | `"+(1) 805 - 443 - 4181"` |
| `email` | Primary contact email; form submissions are emailed here | `"info@suppleautomotive.com"` |
| `address` | Street address (line 1) | `"123 Main St, City, CA 93001"` |
| `addressLine2` | Optional suite/unit/floor | `""` or `"Suite 100"` |
| `tagline` | Short tagline for hero/footer | `"Professional auto care you can trust."` |
| `services` | Array of `{ id, title, description }` for Services section | See `config.js` |
| `hours` | Array of `{ days, time }` for business hours | `[{ days: "Mon–Fri", time: "8am–6pm" }]` |
| `social.facebook` | Facebook profile URL | `"https://facebook.com/..."` |
| `social.instagram` | Instagram profile URL | `"https://instagram.com/..."` |
| `apiBaseUrl` | Optional. Base URL of the API (e.g. if front is on another host). Leave empty when using `npm start` (same origin). | `""` or `"https://api.example.com"` |

After changing `config.js`, refresh the page. No build step required.

## Server env (form → email + SMS)

When you run `npm start` (or `node server.js`), the request-service form is sent to the config `email` (via Resend) and config `phone` (via Twilio). Set these in a `.env` file in the project root (see `.env.example`).

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (resend.com). Required for email. |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `onboarding@resend.dev` or your verified domain). |
| `TWILIO_ACCOUNT_SID` | Twilio account SID. Required for SMS. |
| `TWILIO_AUTH_TOKEN` | Twilio auth token. |
| `TWILIO_FROM_NUMBER` | Twilio phone number used to send SMS (e.g. `+15551234567`). |
| `PORT` | Optional. Server port (default `3000`). |

At least one of email (Resend) or SMS (Twilio) must be configured or the submit endpoint returns 503.

## Supabase (database)

The project includes a Supabase schema in `supabase/migrations/`. Tables: **accounts**, **customers**, **vehicles**, **services**, **service_parts**. Customer contact details and vehicle (year/make/model) live on `customers` and `vehicles`; services reference them and have service name/price/time plus line items in `service_parts`.

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL (e.g. `https://xxxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Service role** key (Project Settings → API → "service_role" secret). Use only on the server; never expose in the browser. Do **not** use the "anon" or "public" key here — that causes "row violates row-level security" errors. |

**Apply the schema:** Run all migrations in order (e.g. Supabase Dashboard → SQL Editor, or `supabase db push`). Include the RLS policy migration `20250303200000_rls_service_role_policies.sql` and `20250303400000_service_payments_and_contacts.sql` (adds `service_payments` and `customer_contacts` for the controls panel and payment tracking).

## Supple Controls panel

The controls panel is at **http://localhost:3000/supplecontrols**. Sign in with the username and password set in `.env`.

| Variable | Description |
|----------|-------------|
| `SUPPLE_CONTROLS_USERNAME` | Username for the controls panel (e.g. `hsupple06`). |
| `SUPPLE_CONTROLS_PASSWORD` | Password for the controls panel. Store only in `.env`; do not commit. |
| `SUPPLE_CONTROLS_SESSION_SECRET` | Secret used to sign the session cookie. Set a long random string in production. |
