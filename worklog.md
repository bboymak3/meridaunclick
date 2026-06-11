# Worklog - MeridaUnClick

---
Task ID: 2
Agent: Main
Task: Paso 2 - Schema v3: Sistema de cuentas (Gratis/Pago), Planes, Suscripciones, Destacados

Work Log:
- Created schema-v3.sql with new tables: plans, user_subscriptions, featured_items
- Added columns to users table: account_type (free/paid), user_type (business/personal), whatsapp_enabled
- Executed schema v3 migration on remote D1 via wrangler (16 queries, 28 rows written)
- Created /api/migrate/schema-v3.js endpoint (GET, admin only) for future re-runs
- Created /api/plans/index.js (GET public lists active plans, POST admin creates plans)
- Created /api/subscriptions/activate.js (POST admin activates subscription for user)
- Updated auth/me.js: auto-migrate + return account_type, user_type, whatsapp_enabled
- Updated auth/register.js: include account_type='free' in JWT payload and response
- Updated users/index.js: SELECT includes account_type, user_type, whatsapp_enabled
- Updated users/[id].js: GET returns new fields, PUT allows updating them
- Updated admin.html: added "Tipo Cuenta" column to users table (colspan 10)
- Updated admin.js: loadUsers() shows account_type badge (gold crown for paid, gray for free), toggle button
- Added toggleAccountType() to admin.js: changes free<->paid via PUT /users/:id, creates subscription record
- Updated dashboard.html: added dashLicenseBadge container in sidebar
- Updated dashboard.js: updateUserDisplay() shows license badge (Normal=gray text, Pago=gold gradient crown)
- Bumped SW cache to v32

Stage Summary:
- 4 plans created in DB: Gratis ($0), Basico 6m ($5), Profesional 6m ($10), Premium 6m ($15)
- Admin panel now shows "Tipo Cuenta" per user with toggle button to switch free/paid
- Dashboard sidebar shows license badge: "Licencia Normal" (gray) or "Licencia Pago" (gold crown)
- /api/plans returns all active plans with features parsed from JSON
- /api/subscriptions/activate creates subscription record and updates user to paid
- All deployed to aunclick.pages.dev (SW v32)

---
Task ID: 1
Agent: Main
Task: Fix dashboard 403 error + create my-businesses API + restore Página Web menu

Work Log:
- Fixed promote-me.js: Changed 403 response to 200 with `{ promoted: false }` to avoid console spam on every dashboard load
- Created new API endpoint: `functions/api/user/my-businesses/index.js` — GET handler that returns businesses owned by the authenticated user (filtered by `user_id` from JWT)
- Restored `showWebPageSelector()` function in js/app.js with modal that: checks auth, fetches user businesses from API, shows business list with links to `/web/:slug`
- Restored `addWebPageMenuItem()` function in js/app.js — adds "Página Web" item to desktop dropdown + mobile CTA
- Added `addWebPageMenuItem()` call in DOMContentLoaded handler
- Bumped SW cache from v20 to v23 to force cache clear for new app.js

Stage Summary:
- Dashboard no longer shows 403 error in console
- `/api/user/my-businesses` endpoint now exists and returns user's businesses
- "Página Web" menu item restored in "Más" dropdown (desktop + mobile)
- All changes pushed to main branch
