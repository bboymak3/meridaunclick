# Worklog - MeridaUnClick

---
Task ID: 5
Agent: Main
Task: Paso 5 - Sistema completo de destacados (featured_items API, productos y empleos)

Work Log:
- Created /api/featured-items/index.js: GET (public, lists featured items by type with date validation) + POST (admin, creates featured item with 30-day default, sets featured flags)
- Created /api/featured-items/[id].js: DELETE (admin, removes featured item and unsets flags) + PUT (admin, update dates/active status)
- Updated marketplace API: added ?featured=1 filter checking featured_at column OR featured_items table
- Updated jobs API: added ?featured=1 filter checking featured column OR featured_items table
- Updated marketplace API SELECT: now returns featured_at and condition fields in public mode
- Added featured products selector to admin.html Settings tab (up to 8 products)
- Added featured jobs selector to admin.html Settings tab (up to 6 jobs)
- Added loadFeaturedProductsSelector(): fetches all approved products, shows checkboxes, limits to 8
- Added saveFeaturedProducts(): clears old featured items, creates new ones via /featured-items API
- Added loadFeaturedJobsSelector(): fetches all approved jobs, shows checkboxes, limits to 6
- Added saveFeaturedJobs(): clears old featured items, creates new ones via /featured-items API
- Updated loadSettings() to also call loadFeaturedProductsSelector and loadFeaturedJobsSelector
- Updated loadFeaturedProducts() in app.js: now fetches ?featured=1 first, falls back to latest 8
- Updated loadFeaturedJobs() in app.js: now fetches ?featured=1 first, falls back to latest 6
- Added gold "Destacado" badge with star icon on product cards (top-left)
- Added gold "Destacado" badge with star icon on job cards (top-right)
- Fixed product cards: now use p.name (not p.title), p.image as fallback for cover
- SW cache bumped to v35

Stage Summary:
- Complete featured items system using featured_items table with date-based activation
- Admin can manage featured businesses (up to 3), products (up to 8), and jobs (up to 6) from Settings tab
- All 3 types of content on index page now try to show featured items first, fallback to latest
- Gold "Destacado" badges visually distinguish featured items from regular ones
- All deployed to aunclick.pages.dev (SW v35)

---
Task ID: 4
Agent: Main
Task: Paso 4 - Destacados en index (productos+empleos), tipo usuario persona natural

Work Log:
- Added "Productos Destacados" section to index.html (after Negocios Destacados)
- Added "Empleos Destacados" section to index.html (after Productos Destacados)
- Created loadFeaturedProducts() in app.js: fetches /marketplace?status=approved&limit=8
- Created loadFeaturedJobs() in app.js: fetches /jobs?status=approved&limit=6
- Product cards: image, title, price, location, condition badge (Nuevo/Usado)
- Job cards: title, company, location, job type badge, salary, hover effects
- Added user_type radio selector to registration form in login.html
- Two options: "Negocio" (default, blue) and "Persona Natural" (marketplace only)
- Radio cards with visual toggle styling (border + background change on select)
- Updated auth.js to read user_type from radio and send to register API
- Renumbered index.html sections (1-9: Hero, Negocios, Productos, Empleos, Categorías, Mapa, Cómo funciona, Stats, CTA)
- SW cache bumped to v34

Stage Summary:
- Index page now shows 3 sections of highlighted content: Negocios, Productos, Empleos
- Registration now lets users choose between "Negocio" and "Persona Natural" account types
- Persona Natural users are flagged in DB for marketplace-only access
- All deployed to aunclick.pages.dev (SW v34)

---
Task ID: 3
Agent: Main
Task: Paso 3 - Plans tab in admin, WhatsApp conditional, subscriptions management

Work Log:
- Added "Planes" tab to admin panel sidebar (crown icon)
- Created Plans tab HTML in admin.html: plan cards grid + subscriptions table
- Added loadPlansTab(), loadPlans(), loadSubscriptions(), formatFeatureName() to admin.js
- Plans cards show: name, price, duration, feature list with checkmarks
- Subscriptions table shows: ID, user, plan, status badge, start/end dates, notes
- Auto-detects expired subscriptions and highlights them in red
- Status filter dropdown (Todas/Activas/Expiradas/Canceladas)
- Created /api/subscriptions/index.js - GET handler returns all subscriptions with user/plan info (admin only)
- Updated businesses/[id].js GET: now returns owner_account_type, owner_user_type, owner_whatsapp_enabled
- Updated business-detail.js: WhatsApp button only visible when owner_account_type === 'paid' AND whatsapp_enabled
- Free accounts show "Botón de WhatsApp disponible solo para cuentas de pago" notice
- Bumped SW cache to v33

Stage Summary:
- Admin panel now has a dedicated Plans tab showing all plans and subscription history
- WhatsApp button on business profiles is now conditional on the business owner being a paid user
- Free account businesses show a locked notice instead of the WhatsApp button
- Subscription history is fully trackable from the admin Plans tab
- All deployed to aunclick.pages.dev (SW v33)

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
