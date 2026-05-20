# RTBO React + PHP Full-Stack Build

This package keeps the current RTBO visual design and moves it into a cleaner full-stack structure:

- `frontend/` is the React website.
- `api/` is the PHP backend for contact, newsletter signup, school registration, PDF generation, and Stripe/PayPal checkout creation.
- `database.sql` contains the MySQL tables from the current RTBO platform.

## Local Development

1. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Start the React dev server:

   ```bash
   npm run dev
   ```

3. Serve the PHP API from a PHP-enabled local server such as MAMP. The React app calls `/api` by default. If your API is on a different local URL, copy `frontend/.env.example` to `frontend/.env` and set:

   ```bash
   VITE_RTBO_API_URL=http://localhost:8888/api
   ```

   If the frontend and API are intentionally served from different local origins, add the frontend origin to `api/.env`:

   ```bash
   RTBO_ALLOWED_ORIGINS=http://localhost:5173
   ```

4. For local dashboard testing without a database, use the same dev login password on both sides:

   ```bash
   RTBO_LOCAL_AUTH_ENABLED=true
   RTBO_LOCAL_ADMIN_PASSWORD=your_local_password
   ```

   If `RTBO_LOCAL_ADMIN_PASSWORD` is blank, the PHP API will fall back to `VITE_RTBO_TEST_PASSWORD` from `frontend/.env.development` when running on `localhost` or `127.0.0.1`.

## Production Deployment

1. Build the React site:

   ```bash
   cd frontend
   npm run build
   ```

2. Upload the contents of `frontend/dist/` to your website public root.
3. Upload the `api/` folder beside the built site so the public URL becomes `https://yourdomain.com/api`.
4. Import `database.sql` into MySQL.
5. Copy `api/.env.example` to `api/.env` on the server and enter your database, email, and payment credentials. Do not put live secrets in the React frontend.
6. Make sure `api/storage/` is writable by PHP. It stores registration JSON files, uploaded profile photos, and generated PDFs.
7. Use live credentials before launch:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `PAYPAL_MODE=live`
   - `PAYPAL_CLIENT_ID=...`
   - `PAYPAL_CLIENT_SECRET=...`

## Mandatory Change Audit

Every project change or new feature must include the following before it is considered complete:

- Responsive audit across mobile, tablet, and desktop layouts touched by the change.
- The responsive audit must include these required viewport widths: `368px`, `480px`, `550px`, `648px`, `768px`, `1024px`, `1280px`, and `1536px`.
- Advanced SEO audit for public pages, including title, description, indexing intent, semantic content, and crawl-safe output.
- Optimization audit, including production build output and bundle-size warnings. New oversized chunks must be fixed through code splitting or other optimization, not only noted.
- Syntax/build verification for the affected stack, including `npm run build` for frontend changes and MAMP PHP lint for edited PHP endpoints.
- Frontend changes must run `npm run build` and `npm run audit` from `frontend/` before completion.
- Accessibility and print-readiness checks when forms, invoices, dashboards, or printable views are changed.
- Phone number inputs must use the shared `(xxx) xxx-xxxx` formatter in React and `rtbo_format_phone_number()` in PHP before values are displayed, saved, exported, or printed.

## Super Admin

The source of truth email is:

```text
admin@rtboofficiating.com
```

For a secure first login, temporarily enable the guarded setup endpoint:

1. In `api/.env`, set `RTBO_SETUP_ENABLED=true`.
2. Set `RTBO_SETUP_TOKEN` to a long random phrase.
3. POST your email, password, and setup token to `/api/setup-super-admin.php`.
4. Confirm you can log into the dashboard.
5. Immediately set `RTBO_SETUP_ENABLED=false`.

Your password must be at least 12 characters.

## Go-Live Checklist

- Confirm contact form sends to the internal emails.
- Submit one test registration in Stripe test mode.
- Submit one test registration in PayPal sandbox mode.
- Confirm the applicant PDF is generated and emailed.
- Confirm a successful checkout sends the paid confirmation PDF to the applicant and admin recipients.
- Switch Stripe and PayPal to live mode.
- Run one live low-dollar payment test, then refund it from Stripe/PayPal.
