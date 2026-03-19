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
| `tagline` | Short tagline for hero/footer | `"Professional Mobile Auto Repair You Can Trust."` |
| `services` | Array of `{ id, title, description }` for Services section | See `config.js` |
| `hours` | Array of `{ days, time }` for business hours | `[{ days: "Mon–Fri", time: "8am–6pm" }]` |
| `social.facebook` | Facebook profile URL | `"https://facebook.com/..."` |
| `social.instagram` | Instagram profile URL | `"https://instagram.com/..."` |
| `apiBaseUrl` | Optional. Base URL of the API (e.g. if front is on another host). Leave empty when using `npm start` (same origin). | `""` or `"https://api.example.com"` |

After changing `config.js`, refresh the page. No build step required.

## Server env (Resend email notifications)

When you run `npm start` (or `node server.js`), email notifications are sent through Resend for:
- service request confirmation to customers,
- service request alerts to your business inbox,
- document-assigned alerts (without attachments),
- account update alerts.

Set these in `.env` at the project root.

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (resend.com). Required for email. |
| `RESEND_FROM_EMAIL` | Sender address (recommended: `hlsbusiness@suppleautomotive.com` from a verified domain). |
| `APP_BASE_URL` | Public base URL used in email links/images (example: `https://suppleautomotive.com`). |
| `PAYMENT_PORTAL_URL` | Optional override for the payment portal link in emails. Defaults to `${APP_BASE_URL}/payment.html`. |
| `EMAIL_LOGO_URL` | Optional override for the email logo URL. Defaults to `${APP_BASE_URL}/logo/logo.png`. |
| `EMAIL_FROM_NAME` | Optional display name for sender identity. |
| `EMAIL_OWNER_NAME` | Name shown in email sign-off. |
| `EMAIL_SIGNATURE_TITLE` | Signature title line (for example: `Owner, Supple Automotive`). |
| `EMAIL_SIGNATURE_PHONE` | Signature phone line. |
| `EMAIL_SIGNATURE_EMAIL` | Signature email line. |
| `PORT` | Optional. Server port (default `3000`). |

### Signature image pool

You can place transparent PNG signature files in:

- `public/signatures/`

Use filenames:

- `Signature1.png` through `Signature9.png`

For each outgoing email, the server picks a random existing file from that set and places it below:

- `Regards, Supple Automotive`

## Supabase (database)

The project includes a Supabase schema in `supabase/migrations/`. Tables: **accounts**, **customers**, **vehicles**, **services**, **service_parts**. Customer contact details and vehicle (year/make/model) live on `customers` and `vehicles`; services reference them and have service name/price/time plus line items in `service_parts`.

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL (e.g. `https://xxxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Service role** key (Project Settings → API → "service_role" secret). Use only on the server; never expose in the browser. Do **not** use the "anon" or "public" key here — that causes "row violates row-level security" errors. |

**Apply the schema:** Run all migrations in order (e.g. Supabase Dashboard → SQL Editor, or `supabase db push`). Include later migrations for service images, invoices (`service_invoices`, `customer_documents`), signature packets (`customer_signature_bundles`, `customer_signature_bundle_docs`), etc.

**Document release (Supple Controls → Document release):** Edit **`doc/agreement.md`** (Markdown). Use section headings `## 1. Title`, `## 2. Title`, … after a cover block starting with `# Title`. Customer/vehicle tokens (`__CUSTOMER_NAME__`, etc.) plus release-time fields (`__LABOR_RATE__`, `__DIAGNOSTIC_FEE__`, `__AUTHORIZED_REPAIR_AMOUNT__`, `__LATE_INTEREST_PCT__`, `__WARRANTY_DAYS__`, `__REQUESTED_SERVICE__`) and `[[CUSTOMER_SIG]]` markers per section are documented in **`lib/default-agreement.md`**. Before releasing Starter Docs (markdown mode), the panel requires every required field, a PDF preview, then submit. An **optional addendum** (custom notes) is appended after the last customer signature block. Values are stored on the bundle as **`release_fields`**. After the customer signs, the final PDF repeats their signature on every customer line and still appends the electronic-record page. If **`SIGNATURE_RELEASE_MODE=pdf-folder`**, static PDFs in **`blank-docs/Starter/`** skip the field form.

Apply migrations through **`20250317160000_signature_release_fields.sql`** (`release_fields` on bundles) and **`20250317140000_signature_signed_pdf.sql`** (`signed_pdf_url`).

**Supabase Storage (public buckets):** Create **`service-images`** (service photos from controls) and **`invoices`** (submitted invoice PDFs). Set each bucket to public so generated URLs work for customers opening PDFs from the payment portal.

## Supple Controls panel

The controls panel is at **http://localhost:3000/supplecontrols**. Sign in with the username and password set in `.env`.

| Variable | Description |
|----------|-------------|
| `SUPPLE_CONTROLS_USERNAME` | Username for the controls panel (e.g. `hsupple06`). |
| `SUPPLE_CONTROLS_PASSWORD` | Password for the controls panel. Store only in `.env`; do not commit. |
| `SUPPLE_CONTROLS_SESSION_SECRET` | Secret used to sign the session cookie. Set a long random string in production. |

## Stripe (Pay Now on payment portal)

The **Pay Now** button on the Payment Portal redirects customers to Stripe Checkout. After they pay, Stripe sends a webhook to your server so the payment is applied to their balance in the database.

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (e.g. `sk_test_...` for test, `sk_live_...` for production). Required for Pay Now. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from the Stripe Dashboard. Create a webhook endpoint with URL `https://your-domain.com/api/stripe-webhook` and event **checkout.session.completed**; copy the "Signing secret" (starts with `whsec_...`) here. |

**Local testing:** Use the Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe-webhook`. Use the secret it prints as `STRIPE_WEBHOOK_SECRET`.
