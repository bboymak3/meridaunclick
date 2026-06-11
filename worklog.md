# Worklog - MeridaUnClick

---
Task ID: inmuebles-system
Agent: Main
Task: Sistema completo de inmuebles - publicar, buscar, gestionar propiedades desde aunclick

Work Log:
- Creado schema-properties.sql: tablas properties, property_images, property_contacts, property_favorites con indices
- Creada API /properties: GET (listar con filtros: tipo, operacion, ciudad, estado, precio, habitaciones, banos, busqueda, paginacion, destacados) + POST (crear)
- Creada API /properties/[id]: GET (detalle con imagenes y owner info, incrementa views) + PUT (editar, owner/admin) + DELETE (eliminar con limpieza R2)
- Creada API /properties/[id]/approve: POST (admin aprueba propiedad)
- Creada API /properties/[id]/reject: POST (admin rechaza propiedad)
- Creada API /property-images/[propertyId]: GET (listar), POST (registrar imagen desde URL), DELETE (eliminar)
- Creada API /property-favorites: GET (listar favoritos), POST (agregar), DELETE (quitar)
- Creada API /property-favorites/check: GET (verificar si es favorito)
- Creada new-property.html: formulario 5 pasos (Info basica, Precio, Ubicacion con mapa Leaflet, Caracteristicas, Fotos con drag-drop y URL)
- Creado js/property-form.js: logica completa del formulario, mapa interactivo, subida de imagenes, edicion de propiedades
- Creada property-detail.html: detalle con galeria, badges, precio, caracteristicas, mapa, contacto WhatsApp, propiedades similares
- Creado js/property-detail.js: galeria con lightbox, favoritos, mapa, WhatsApp, propiedades similares
- Creada properties.html: busqueda con filtros avanzados, vista grid/lista, mini-mapa toggleable
- Creado js/properties-search.js: busqueda con paginacion, ordenamiento, filtros activos, mini-mapa Leaflet
- Modificado index.html: nueva seccion "Inmuebles Destacados" con grid de propiedades
- Modificado js/app.js: loadFeaturedPropertiesSection(), createPropertyCard(), mapeos de tipos/operaciones/monedas
- Modificado admin.html: nueva pestana "Inmuebles" con tabla, filtros (status, tipo, busqueda), paginacion
- Modificado js/admin.js: loadInmueblesTab(), renderInmuebleRow(), approve/reject/delete/toggleFeatured
- Modificado dashboard.html: nueva seccion "Mis Inmuebles" con grid y filtro de status
- Modificado js/dashboard.js: loadMyInmuebles(), deleteMyInmueble(), filtro por status
- Modificadas 15 paginas HTML: enlace "Inmuebles" en nav + "Publicar Inmueble" en dropdown
- Modificado css/styles.css: estilos para business-card-img, card-badges, card-badge-type, card-badge-op, business-card-price, business-card-stats
- Modificado sw.js: cache v40 con nuevas paginas y JS
- Deploy exitoso a aunclick.pages.dev

Stage Summary:
- Sistema de inmuebles completo integrado en Un Click
- Usuarios normales pueden publicar inmuebles (no solo negocios)
- 10 tipos de propiedad: casa, apartamento, terreno, local_comercial, oficina, hotel, finca, galpon, estacionamiento, otro
- 3 tipos de operacion: venta, alquiler, venta_alquiler
- Formulario con mapa interactivo (Leaflet + Nominatim, restringido a Venezuela)
- Admin puede aprobar/rechazar/destacar propiedades
- Dashboard muestra "Mis Inmuebles" para cada usuario
- Busqueda con filtros avanzados y mini-mapa
- PENDIENTE: Ejecutar schema-properties.sql en D1 remoto para crear tablas

---
Task ID: 7-8-final
Agent: Main
Task: Paso 7-8 completos: Inmuebles destacados en index, Foto desde URL, Admin selector

Work Log:
- index.html: nueva seccion 5 "Inmuebles Destacados" con grid de cards, link a millano.pages.dev
- Secciones renumeradas (6 Categorias, 7 Mapa, 8 Como Funciona, 9 Stats, 10 CTA)
- app.js: nueva funcion loadFeaturedInmuebles() - fetch /properties?status=approved&limit=6, fallback a latest
- Cards de inmuebles: imagen, badge tipo+operacion, titulo, ubicacion, hab./banos, precio, link a millano
- Soporte para featured badge gold en inmuebles (via featured_items?type=property)
- Funcion escapeHtml() agregada a app.js como utilidad global
- new-business.html: campo "Agregar foto desde URL" con input URL + boton "Agregar"
- business-form.js: setupPhotoFromUrl() valida URL, agrega a uploadedImages con flag isFromUrl
- business-form.js: submit maneja urlImages por separado - registra en DB via /images/:id sin upload R2
- admin.html: nuevo selector "Inmuebles Destacados en Inicio" (hasta 6, checkboxes con tipo+operacion)
- admin.js: loadFeaturedPropertiesSelector() + saveFeaturedProperties() con featured_items API
- loadSettings() ahora llama loadFeaturedPropertiesSelector()
- SW cache bumped a v39
- Push a main, deploy exitoso (200)

Stage Summary:
- Index ahora muestra 4 secciones destacadas: Negocios, Productos, Empleos, Inmuebles
- Inmuebles link a millano.pages.dev (portal de casas separado)
- Admin puede seleccionar hasta 6 inmuebles destacados desde Settings
- Formulario de negocio ahora acepta fotos desde URL (no solo upload)
- Sistema de destacados completo: 4 tipos de contenido con badges gold

---
Task ID: 7-8
Agent: Main
Task: Paso 7 (Banner/Logo/SEO) + Paso 8 (Pulimento UI, Twitter Cards, Animaciones)

Work Log:
- Agregadas 14 nuevas keys a DEFAULT_SETTINGS en /api/settings/index.js: hero_title, hero_subtitle, hero_badge, hero_image_url, hero_cta_text, hero_cta_link, logo_url, logo_text, meta_title, meta_description, meta_keywords, og_image_url, footer_text, footer_link_url/footer_link_text
- PUBLIC_KEYS actualizado en /api/settings/public.js con todas las nuevas keys + defaults
- Admin.html: 5 nuevas secciones en tab Settings: Banner Hero (titulo, subtitulo, badge, imagen fondo, CTA), Logo (URL imagen, texto), SEO (meta title/description/keywords, OG image), Footer (texto, enlace)
- Admin.html: vista previa en tiempo real del hero con parseo de {highlight}...{end}
- admin.js: loadSettings() ahora llama updateHeroPreview(); nueva funcion updateHeroPreview() con listeners input
- index.html: IDs agregados a hero (heroSection, heroBg, heroBadge, heroBadgeText, heroTitle, heroSubtitle), nav-logo (navLogo, navLogoIcon, brandNameText), meta tags (metaDescription, metaKeywords, pageTitle, ogTitle, ogDescription, ogImage)
- index.html: Twitter Card meta tags agregados (twitter:card, twitter:title, twitter:description, twitter:image) + canonical URL
- app.js: nueva funcion loadPublicSettings() - fetch /settings/public y aplica: hero bg image + overlay, badge, titulo con highlight, logo image/text, meta tags, OG + Twitter, footer
- app.js: IntersectionObserver para fade-in de secciones .idx-section al scroll
- css/styles.css: skeleton loading animations, section fade-in transitions, hero entrance animation, card hover improvements, toast transitions, admin settings styling
- SW cache bumped a v38
- Push a main, deploy exitoso en aunclick.pages.dev (200)

Stage Summary:
- Admin puede gestionar completamente la apariencia del sitio desde Settings: hero banner, logo, SEO, footer
- Hero soporta imagen de fondo personalizada con overlay automatico para legibilidad
- Titulo del hero soporta syntax {highlight}texto{end} para texto resaltado
- Logo soporta imagen custom (reemplaza icono FA) y texto personalizado
- Meta tags (title, description, keywords) actualizables desde admin
- Open Graph + Twitter Card tags sincronizados automaticamente
- Secciones del index hacen fade-in al scroll (IntersectionObserver)
- Animacion de entrada del hero con fade + slide up
- Cards mejoradas con hover elevation (translateY + shadow)
- Skeleton CSS disponible para futuros loading states

---
Task ID: 6-fix
Agent: Main
Task: Correccion de URLs - casasbarinas.pages.dev -> millano.pages.dev

Work Log:
- index.html:63 - Link del menu "Casas / Inmuebles" corregido a millano.pages.dev
- admin.html:538 - Boton "Publicar Casa" corregido a millano.pages.dev/new-property.html
- js/admin.js:2202 - Link de detalle de propiedad corregido a millano.pages.dev/property.html
- SW cache bumped a v37 para invalidar cache de usuarios con URLs viejas
- Verificado: no quedan referencias a casasbarinas.pages.dev en meridaunclick
- No hay URLs auto-referenciales en casasbarinas repo (ningun cambio necesario alli)
- Push a main, deploy exitoso en aunclick.pages.dev

Stage Summary:
- Todas las URLs de aunclick que apuntaban al portal de casas ahora redirigen a https://millano.pages.dev
- El repo sigue siendo github.com/bboymak3/casasbarinas pero la web es millano.pages.dev
- Deploy verificado: aunclick.pages.dev responde 200

---
Task ID: 6
Agent: Main
Task: Paso 6 - Integracion casasbarinas + aunclick: DB compartida, Google OAuth, admin de propiedades

Work Log:
- Columnas google_id y auth_provider agregadas a users en generico_db
- Usuarios migrados: Gustavo Ruiz y Joseph Valencia insertados, Carlos Herrera google_id actualizado
- Tablas creadas en generico_db: properties, property_images, property_contacts, property_favorites (con indices)
- 6 propiedades migradas de casas_db a generico_db con imagenes (14 registros)
- Mapeo de user_ids: casas_db user 2 -> generico_db user 3 (bboymak3@gmail.com)
- Creada API /properties (GET con filtros/paginacion, POST crear propiedad)
- Creada API /properties/[id] (GET detalle, DELETE admin)
- Creada API /properties/[id]/approve y reject (POST admin)
- Google OAuth agregado a aunclick: /auth/google.js + /auth/google-config.js
- auth/me.js: SELECT ahora incluye google_id y auth_provider
- Admin: nueva pestaña "Casas" con tabla de propiedades (tipo, operacion, precio, propietario, estatus)
- Admin: botones aprobar/rechazar/eliminar, filtro por estatus, paginacion
- Menu index: link "Casas / Inmuebles" en dropdown Mas -> casasbarinas.pages.dev
- casasbarinas reconectado a generico_db via Cloudflare API (DB binding cambiada)
- casasbarinas: tablas renombradas (images->property_images, contacts->property_contacts, favorites->property_favorites)
- casasbarinas: JWT_SECRET fallback unificado a aunclick_default_secret_2024
- casasbarinas: auth/me.js y register.js actualizados con google_id/auth_provider
- SW cache bumped a v36 (aunclick)
- Ambos repos push a main

Stage Summary:
- Ambos portales (aunclick + casasbarinas) ahora comparten la misma DB generico_db
- Mismo sistema de usuarios: misma cuenta funciona en ambos portales
- Google OAuth disponible en aunclick (necesita GOOGLE_CLIENT_ID en dashboard)
- Propiedades se gestionan desde admin de aunclick (pestaña Casas)
- Casas NO aparecen en aunclick index (contenido separado)
- Menu de aunclick incluye link a casasbarinas

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
---
Task ID: 1
Agent: Main Agent
Task: Fix multiple bugs reported by user - map filters, video upload, featured items, cache, R2 images

Work Log:
- Installed wrangler CLI (v4.100.0) and authenticated with Cloudflare API token
- Verified all 33 tables exist in D1 remote database
- Added 5 missing indexes for properties tables
- Added `featured` column to `job_listings` table (was missing, caused "no such column: featured" error)
- Added `featured` column to `products` table
- Fixed upload API (`functions/api/upload.js`) to support video files (mp4, webm, mov) and `product_type=video`
- Created new endpoint `functions/api/featured-items/index.js` (GET/POST/DELETE) that was missing
- Fixed map page: added toggle buttons for Negocios/Propiedades, added `loadMapProperties()`, `createPropertyMarker()`, `renderPropertyList()`, `showMapType()` functions
- Fixed bug in map.js line 394: `data.slug` was undefined, changed to lookup from allBusinesses array
- Fixed 11 property image URLs in D1: converted from direct R2 URLs (returning 400) to `/api/serve?key=...` format
- Updated `_headers` to use `must-revalidate` instead of `immutable` for CSS/JS files (1 hour cache)
- Bumped service worker version from v40 to v41 to force cache refresh

Stage Summary:
- 7 files modified: upload.js, map.js, map.html, _headers, sw.js, worklog.md
- 1 file created: functions/api/featured-items/index.js
- 3 D1 database alterations executed
- All reported bugs addressed
