# HolaX - Directorio Nacional de Negocios de Venezuela

> Plataforma web progresiva (PWA) para descubrir, registrar y gestionar negocios en Venezuela. Incluye directorio con mapa interactivo, marketplace de productos, bolsa de empleo, gestion de inmuebles, reservas, cupones, chat en tiempo real, IA chatbot, seccion dedicada de servicios medicos y mas.

**URL en produccion:** [https://aunclick.pages.dev](https://aunclick.pages.dev)

---

## Caracteristicas Principales

- **Directorio de Negocios** — Busqueda por categoria, estado/ciudad, tipo de negocio. Fichas detalladas con galeria, mapa, servicios, productos, videos y contactos por WhatsApp.
- **Seccion de Servicios Medicos** — Categoria dedicada "Medicina / Servicio Medico" con seccion propia en la homepage y selector de destacados independiente en el panel admin.
- **Paginas Web Automaticas** — Cada negocio aprobado genera automaticamente una landing page profesional en `/web/:slug` con banner, logo, productos, FAQ, galeria, mapa y contacto.
- **Mapa Interactivo** — Visualizacion geolocalizada de negocios con Leaflet/OpenStreetMap.
- **Marketplace** — Publicacion y busqueda de productos con multiples fotos, videos (URL y archivo adjunto), filtros por categoria/precio. Contacto directo por WhatsApp. Banner configurable desde el panel admin con recorte optimizado.
- **Gestion de Inmuebles** — Publicacion de propiedades (venta/alquiler) con multiples fotos, videos, mapa, 6 pasos de formulario, galeria con lightbox.
- **Bolsa de Empleo** — Publicacion de ofertas laborales vinculadas a negocios.
- **Gestion de Servicios** — Cada negocio puede registrar los servicios que ofrece, editables desde el panel del usuario.
- **Reservas y Cupones** — Modulos para reservar citas y gestionar cupones/promociones.
- **Entretenimiento y Eventos** — Directorio de opciones de entretenimiento.
- **Emergencias** — Directorio de numeros de emergencia por estado.
- **Chat en Tiempo Real** — Sistema de mensajeria entre usuarios y negocios con WebSocket.
- **IA Chatbot** — Asistente virtual integrado para ayudar a los usuarios (OpenAI API).
- **Sistema de Puntos** — Los usuarios ganan puntos por visitas, reservas y resenas. Canjeable por beneficios premium.
- **Resenas y Calificaciones** — Sistema de resenas con estrellas para negocios y productos.
- **PWA (Progressive Web App)** — Instalable en movil y escritorio. Funciona offline con Service Worker.
- **Panel de Usuario** — Dashboard para gestionar negocios, productos, inmuebles, mensajes, favoritos y perfil.
- **Panel de Administracion** — Aprobacion de negocios pendientes, gestion de usuarios, contenido, configuracion del sitio (banners, logos, modulos), seleccion de destacados por categoria (negocios, servicios medicos, inmuebles, productos, empleos).
- **SEO Completo** — Sitemap XML dinamico, robots.txt, meta tags Open Graph, Twitter Cards, datos estructurados para cada ficha.
- **Sistema de Planes** — Plan basico (gratuito, 20 dias expiracion) y plan premium (sin expiracion, mas visibilidad).

---

## Arquitectura Tecnica

### Stack

| Componente | Tecnologia | Detalle |
|---|---|---|
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) | Sin frameworks. JS modular por archivos |
| Backend | Cloudflare Pages Functions | Serverless, Edge Computing |
| Base de Datos | Cloudflare D1 (SQLite) | Binding: `DB` |
| Almacenamiento | Cloudflare R2 | Imagenes, videos, logos, banners |
| Mapas | Leaflet + OpenStreetMap + Nominatim | Geocodificacion y mapa interactivo |
| Autenticacion | JWT (HMAC-SHA256) | Configurado via variable de entorno |
| Cache | Service Worker | cache-first + stale-while-revalidate |
| Despliegue | Cloudflare Pages | CI/CD automatico desde GitHub (`git push origin main`) |
| Fonts | Google Fonts (Inter) | Cargado desde CDN |
| Iconos | Font Awesome 6.5.1 | Cargado desde cdnjs |
| PWA | manifest.json + sw.js | Instalable, cache offline |

### Flujo de Despliegue

```
git push origin main
  → GitHub recibe el push
    → Cloudflare Pages detecta el cambio
      → Build automatico (no requiere build step)
        → Deploy a produccion
          → URL: https://aunclick.pages.dev
```

No hay paso de build. Los archivos HTML/CSS/JS se sirven directamente. Las `functions/` se ejecutan como Workers serverless en el edge.

---

## Estructura del Proyecto

```
meridaunclick/
├── index.html                  # Homepage (hero, categorias, negocios destacados, servicios medicos)
├── search.html                 # Busqueda de negocios con filtros
├── map.html                    # Mapa interactivo completo
├── marketplace.html            # Marketplace de productos (banner configurable)
├── properties.html             # Listado de inmuebles
├── empleo.html                 # Bolsa de empleo
├── entretenimiento.html        # Entretenimiento
├── eventos.html                # Eventos
├── reservas.html               # Reservas
├── cupones.html                # Cupones y promociones
├── emergencia.html             # Emergencias
├── planes.html                 # Planes (basico/premium)
├── dashboard.html              # Panel del usuario (gestion completa)
├── login.html                  # Login / Registro
├── admin.html                  # Panel de administracion
├── admin-chat.html             # Panel de chat admin
├── admin-vendedores.html       # Panel de vendedores
├── new-business.html           # Formulario registro negocio (paso a paso)
├── new-property.html           # Formulario registro inmueble (6 pasos)
├── property-detail.html        # Ficha de inmueble (detalle)
├── contacto.html               # Formulario de contacto
├── privacidad.html             # Politica de privacidad
├── eliminacion-datos.html      # Eliminacion de datos (GDPR)
├── quienes-somos.html          # Quienes somos
├── mision-vision.html          # Mision y vision
├── clientes-satisfechos.html   # Testimonios
├── manifest.json               # PWA Manifest
├── sw.js                       # Service Worker (cache offline)
├── robots.txt                  # Robots.txt estatico (redirige a /api/robots)
├── _redirects                  # Redirecciones Cloudflare Pages
├── _headers                    # Headers de seguridad Cloudflare Pages
├── wrangler.toml               # Configuracion Cloudflare (D1 + R2 bindings)
│
├── css/
│   └── styles.css              # Estilos principales (~3000+ lineas)
│
├── js/
│   ├── app.js                  # Modulo principal (API helper, auth, UI, nav, hero banner/logo, destacados medicos)
│   ├── dashboard.js            # Dashboard usuario (negocios, productos, inmuebles, empleos)
│   ├── admin.js                # Panel admin (todas las tabs, CRUD, settings, banners, logos, destacados por categoria)
│   ├── business-detail.js      # Ficha de negocio (galeria, productos, servicios, mapa, lightbox)
│   ├── business-form.js        # Formulario registro negocio (anti-doble-submit)
│   ├── property-form.js        # Formulario registro inmueble (6 pasos, fotos, videos)
│   ├── property-detail.js      # Ficha de inmueble (galeria, videos, lightbox)
│   ├── auth.js                 # Login y registro
│   ├── chat.js                 # Chat en tiempo real (WebSocket)
│   ├── review-widget.js        # Widget de resenas
│   ├── ai-chatbot.js           # Chatbot con IA (OpenAI)
│   ├── home-map.js             # Mapa de la homepage
│   └── map.js                  # Pagina de mapa completo
│
├── images/
│   ├── favicon.jpeg            # Logo/Favicon principal (HolaX)
│   ├── logoprincipal.jpeg      # Logo principal
│   ├── PWA.jpeg                # Icono PWA (512x512)
│   └── favicom.jpeg            # Favicon alternativo
│
├── functions/
│   ├── negocio/[slug].js       # Pagina de ficha de negocio (SSR, SEO completo)
│   ├── producto/[slug].js      # Pagina de ficha de producto (SSR, SEO completo)
│   ├── web/[slug].js           # Landing page automatica por negocio (SSR)
│   │
│   └── api/
│       ├── admin/              # Admin (sellers, chat-logs, create-user)
│       ├── auth/               # Autenticacion (login, register, me, promote-me, google, google-config)
│       ├── ai-chat/            # Chatbot IA
│       ├── backfill-slugs/     # Utilidad de migracion de slugs
│       ├── bookings/           # Reservas
│       ├── business-stats/     # Estadisticas de negocios (vistas, tracking)
│       ├── businesses/         # CRUD negocios
│       │   ├── index.js        #   GET (listar/buscar), POST (crear)
│       │   └── [id]/           #   GET/PUT/DELETE + approve.js, reject.js
│       │       └── services/   #   CRUD servicios por negocio
│       ├── categories/         # Categorias de negocios
│       ├── chat/               # Chat en tiempo real (conversations, messages, config)
│       ├── contacts/           # Formulario de contacto (+ admin-message)
│       ├── coupons/            # Cupones y promociones
│       ├── debug/              # Utilidades de depuracion (health, chat-status, premium-check, map-check)
│       ├── emergency/          # Directorio de emergencias
│       ├── events/             # Eventos
│       ├── facebook/           # Integracion Facebook (import, config, history)
│       ├── favorites/          # Sistema de favoritos (negocios) + check
│       ├── featured-items/     # Elementos destacados (business, product, job, property, medical)
│       ├── images/             # Gestion de imagenes de negocios + set-cover
│       ├── jobs/               # Ofertas de empleo
│       ├── marketplace/        # CRUD de productos (+ approve/reject)
│       ├── migrate/            # Migraciones de DB (schema-premium, add-social-video)
│       ├── notifications/      # Notificaciones push
│       ├── plans/              # Planes (request-upgrade)
│       ├── points/             # Sistema de puntos
│       ├── premium-requests/   # Solicitudes de plan premium (+ approve/reject)
│       ├── product-comments/   # Comentarios en productos
│       ├── properties/         # CRUD de inmuebles (+ approve/reject)
│       ├── property-favorites/ # Favoritos de inmuebles + check
│       ├── property-images/    # Gestion de imagenes de inmuebles
│       ├── reviews/            # Resenas de negocios
│       ├── robots/             # Robots.txt dinamico
│       ├── serve/              # Servidor de archivos R2 (imagenes, videos)
│       ├── settings/           # Configuracion del admin
│       │   ├── index.js        #   GET/PUT/POST (admin only)
│       │   └── public.js       #   GET (publico, subset de keys)
│       ├── sitemap/            # Sitemap XML dinamico
│       ├── stats.js            # Estadisticas generales
│       ├── upload.js           # Subida de archivos a R2 (imagenes, videos, banners, logos)
│       ├── user/               # Perfil de usuario (my-businesses)
│       └── users/              # Gestion de usuarios (admin) + activate-premium
│
└── worklog.md                  # Log de trabajo de desarrollo
```

---

## Base de Datos (D1 - SQLite)

### Tablas Principales

| Tabla | Descripcion | Campos Clave |
|---|---|---|
| `users` | Usuarios del sistema | id, name, email, phone, password_hash, role (user/admin), plan (basic/premium) |
| `businesses` | Negocios registrados | id, user_id, title, slug, description, category_id, logo, banner, address, city, state, lat, lng, phone, whatsapp, website, instagram, facebook, twitter, tiktok, youtube, video_url, schedule, status (pending/approved/rejected), featured, views, expires_at, custom_html |
| `business_services` | Servicios por negocio | id, business_id, name, description, price |
| `images` | Imagenes de negocios | id, business_id, url, thumbnail_url, is_cover, order_index |
| `products` | Productos del marketplace | id, business_id, name, slug, description, price, currency, image (JSON array), video_url (JSON array), category, status, views |
| `properties` | Inmuebles | id, user_id, title, slug, property_type, operation_type, price, address, city, lat, lng, bedrooms, bathrooms, area, video_url, status, featured, views, expires_at |
| `property_images` | Imagenes de inmuebles | id, property_id, url, is_cover, order_index (tabla separada, many-to-one) |
| `jobs` | Ofertas de empleo | id, business_id, title, description, company, location, salary, type, status |
| `contacts` | Mensajes de contacto | id, business_id, name, email, phone, message |
| `favorites` | Negocios favoritos | id, user_id, business_id |
| `property_favorites` | Inmuebles favoritos | id, user_id, property_id |
| `reviews` | Resenas de negocios | id, business_id, user_id, rating, comment |
| `categories` | Categorias de negocios | id, name, slug, icon |
| `featured_items` | Elementos destacados | id, item_type (business/product/job/property/medical), item_id, user_id, title, start_date, end_date |
| `admin_settings` | Configuracion del sitio | key (TEXT PK), value (TEXT) |
| `coupons` | Cupones y promociones | id, business_id, code, discount, expires_at |
| `bookings` | Reservas | id, business_id, user_id, date, time, status |
| `points_transactions` | Transacciones de puntos | id, user_id, points, type, reference_id |
| `chat_rooms` | Salas de chat | id, business_id, user_id |
| `chat_messages` | Mensajes de chat | id, room_id, sender_id, message, read |

### Tipos de item_type en featured_items

| Tipo | Descripcion | Maximo destacados |
|---|---|---|
| `business` | Negocios generales | 4 |
| `medical` | Servicios medicos (categoria: medicina-servicio-medico) | 4 |
| `property` | Inmuebles | 4 |
| `product` | Productos del marketplace | 4 |
| `job` | Ofertas de empleo | 4 |

### Campos de Configuracion (admin_settings)

| Key | Default | Descripcion |
|---|---|---|
| `site_name` | `AuNclick Merida` | Nombre del sitio |
| `site_description` | `Directorio de negocios y servicios en Merida, Venezuela` | Descripcion del sitio |
| `contact_email` | `""` | Email de contacto |
| `whatsapp_number` | `""` | Numero de WhatsApp |
| `hero_banner_url` | `""` | URL del banner principal (homepage) — con recorte 15% desktop / 10% movil |
| `hero_logo_url` | `""` | URL del logo sobre el banner (homepage) |
| `marketplace_banner_url` | `""` | URL del banner del marketplace — mismo comportamiento de recorte que el hero |
| `businesses_enabled` | `1` | Modulo de negocios activo |
| `marketplace_enabled` | `1` | Modulo de marketplace activo |
| `jobs_enabled` | `1` | Modulo de empleo activo |
| `events_enabled` | `1` | Modulo de eventos activo |
| `chat_enabled` | `1` | Chat activo |
| `chat_mode` | `all` | `all` / `premium_only` / `none` |
| `reviews_enabled` | `1` | Resenas activas |
| `coupons_enabled` | `1` | Cupones activos |
| `bookings_enabled` | `0` | Reservas activas |
| `points_enabled` | `0` | Sistema de puntos activo |
| `ai_chatbot_enabled` | `0` | Chatbot IA activo |
| `ai_chatbot_welcome` | `""` | Mensaje de bienvenida del chatbot |
| `anonymous_comments_enabled` | `1` | Comentarios anonimos permitidos |
| `require_approval` | `1` | Negocios requieren aprobacion admin |
| `registrations_enabled` | `1` | Registro de usuarios habilitado |
| `maintenance_mode` | `0` | Modo mantenimiento |
| `emergency_enabled` | `1` | Modulo de emergencias activo |
| `featured_price` | `0` | Precio para ser destacado |
| `max_businesses_per_user` | `10` | Max negocios por usuario |
| `points_per_visit` | `10` | Puntos por visita |
| `points_per_review` | `20` | Puntos por resena |
| `points_per_booking` | `15` | Puntos por reserva |

---

## APIs Principales

### Autenticacion

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/auth/login` | POST | No | Login (email + password) → JWT |
| `/api/auth/register` | POST | No | Registro de usuario |
| `/api/auth/me` | GET | Si | Datos del usuario actual |
| `/api/auth/promote-me` | POST | Si | Solicitar plan premium |
| `/api/auth/google` | POST | No | Login con Google |
| `/api/auth/google-config` | GET | No | Configuracion de Google OAuth |

### Negocios

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/businesses` | GET | No | Listar/buscar negocios (filtros: category, city, state, search, featured, etc.) |
| `/api/businesses` | POST | Si | Crear negocio |
| `/api/businesses/:id` | GET | No | Detalle de negocio (con imagenes, servicios) |
| `/api/businesses/:id` | PUT | Si | Editar negocio (owner/admin) |
| `/api/businesses/:id` | DELETE | Si | Eliminar negocio (owner/admin) |
| `/api/businesses/:id/approve` | POST | Admin | Aprobar negocio |
| `/api/businesses/:id/reject` | POST | Admin | Rechazar negocio |
| `/api/businesses/:id/services` | GET | No | Listar servicios |
| `/api/businesses/:id/services` | POST | Si | Crear servicio |
| `/api/businesses/:id/services/:sid` | PUT | Si | Editar servicio |
| `/api/businesses/:id/services/:sid` | DELETE | Si | Eliminar servicio |
| `/api/businesses/:id/stats` | GET | No | Estadisticas de vistas |
| `/api/businesses/:id/stats/track` | POST | No | Registrar vista |

### Productos (Marketplace)

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/marketplace` | GET | No | Listar productos (filtros: business_id, category, search, status) |
| `/api/marketplace` | POST | Si | Crear producto |
| `/api/marketplace/:id` | GET | No | Detalle de producto |
| `/api/marketplace/:id` | PUT | Si | Editar producto |
| `/api/marketplace/:id` | DELETE | Si | Eliminar producto |
| `/api/marketplace/:id/approve` | POST | Admin | Aprobar producto |
| `/api/marketplace/:id/reject` | POST | Admin | Rechazar producto |

### Inmuebles

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/properties` | GET | No | Listar inmuebles (filtros: type, operation, city, price, etc.) |
| `/api/properties` | POST | Si | Crear inmueble |
| `/api/properties/:id` | GET | No | Detalle (con imagenes) |
| `/api/properties/:id` | PUT | Si | Editar inmueble (incluye video_url) |
| `/api/properties/:id` | DELETE | Si | Eliminar inmueble |
| `/api/properties/:id/approve` | POST | Admin | Aprobar inmueble |
| `/api/properties/:id/reject` | POST | Admin | Rechazar inmueble |
| `/api/property-images/:propertyId` | GET | No | Listar imagenes |
| `/api/property-images/:propertyId` | POST | Si | Agregar imagen |
| `/api/property-images/:propertyId` | DELETE | Si | Eliminar imagen |

### Empleo

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/jobs` | GET | No | Listar ofertas |
| `/api/jobs` | POST | Si | Crear oferta |
| `/api/jobs/:id` | PUT/DELETE | Si | Editar/eliminar |

### Elementos Destacados

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/featured-items` | GET | No | Listar destacados (filtro: `?item_type=business\|medical\|product\|property\|job`) |
| `/api/featured-items` | POST | Admin | Agregar destacado (body: `item_type`, `item_id`) |
| `/api/featured-items/:id` | DELETE | Admin | Eliminar destacado |

### Otros

| Endpoint | Metodo | Auth | Descripcion |
|---|---|---|---|
| `/api/upload` | POST | Si | Subir archivo a R2 (image/*, video/* hasta 50MB) |
| `/api/serve` | GET | No | Servir archivos desde R2 |
| `/api/settings` | GET/PUT | Admin | Configuracion completa del sitio |
| `/api/settings` | POST | Admin | Restablecer configuracion a defaults |
| `/api/settings/public` | GET | No | Settings publicos (site_name, hero_banner_url, hero_logo_url, marketplace_banner_url) |
| `/api/favorites` | GET/POST/DELETE | Si | Favoritos de negocios |
| `/api/favorites/check` | GET | Si | Verificar si un negocio es favorito |
| `/api/property-favorites` | GET/POST/DELETE | Si | Favoritos de inmuebles |
| `/api/property-favorites/check` | GET | Si | Verificar si un inmueble es favorito |
| `/api/reviews` | GET/POST | Varia | Resenas |
| `/api/categories` | GET | No | Lista de categorias |
| `/api/product-comments` | GET/POST | Varia | Comentarios en productos |
| `/api/contacts` | POST | No | Enviar mensaje de contacto |
| `/api/contacts/admin-message` | POST | No | Mensaje directo al admin |
| `/api/coupons` | GET/POST/DELETE | Varia | Cupones |
| `/api/bookings` | GET/POST | Varia | Reservas |
| `/api/notifications` | GET | Si | Notificaciones del usuario |
| `/api/points` | GET | Si | Balance de puntos |
| `/api/plans/request-upgrade` | POST | Si | Solicitar upgrade a premium |
| `/api/premium-requests` | GET | Admin | Solicitudes premium pendientes |
| `/api/sitemap` | GET | No | Sitemap XML dinamico |
| `/api/robots` | GET | No | Robots.txt dinamico |
| `/api/ai-chat` | POST | No | Chatbot IA (streaming) |
| `/api/user/my-businesses` | GET | Si | Negocios del usuario actual |
| `/api/users` | GET | Admin | Listar usuarios |
| `/api/users/:id` | GET/PUT | Admin | Detalle/editar usuario |
| `/api/users/:id/activate-premium` | POST | Admin | Activar premium manualmente |
| `/api/admin/sellers` | GET | Admin | Lista de vendedores |
| `/api/admin/chat-logs` | GET | Admin | Logs de chat |
| `/api/emergency` | GET | No | Directorio de emergencias |
| `/api/events` | GET/POST | Varia | Eventos |
| `/api/facebook/import` | POST | Admin | Importar desde Facebook |
| `/api/stats` | GET | No | Estadisticas generales del sitio |

---

## Paginas Dinamicas (Server-Side Rendered)

Estas paginas se generan en el servidor (Cloudflare Pages Functions) con HTML completo, SEO optimizado:

| Ruta | Archivo | Descripcion |
|---|---|---|
| `/negocio/:slug` | `functions/negocio/[slug].js` | Ficha completa del negocio (banner, logo, galeria, productos, servicios, empleos, mapa, resenas) |
| `/producto/:slug` | `functions/producto/[slug].js` | Ficha del producto (imagenes, videos, descripcion, negocio vinculado) |
| `/web/:slug` | `functions/web/[slug].js` | Landing page automatica del negocio (banner, logo, productos, FAQ, servicios, galeria, mapa, CTA WhatsApp) |

Todas incluyen: `<title>`, `<meta description>`, Open Graph, Twitter Cards, canonical URL, y datos estructurados.

---

## Diseno y UX

### Fichas de Negocio (Cards)
- **Layout vertical** con proporcion de imagen `aspect-ratio: 3/4` y `object-fit: contain` para mostrar la foto completa sin recortes.
- **Grid responsivo:** 4 columnas en desktop, 3 en tablet, 2 en movil.
- **Badge de destacado** centrado en la parte superior de cada ficha, visible en todos los dispositivos.
- **Maximo 4 destacados** por categoria (negocios, servicios medicos, inmuebles, productos, empleos).

### Banners
- **Banner hero (homepage):** Configurable desde el panel admin (`hero_banner_url`). Recorte automatico: 15% arriba y abajo en desktop, 10% en movil. Implementado con `background-size: 100% 130%` y `background-position: center 15%`.
- **Banner marketplace:** Configurable desde el panel admin (`marketplace_banner_url`). Mismo comportamiento de recorte que el hero. Se aplica con la clase `.mp-hero-bg`.

### Busqueda
- **Modal de busqueda:** Cuando esta abierto, los elementos flotantes (botones de WhatsApp, badges, favoritos, chat, pulsaciones de IA) se ocultan con `visibility: hidden` para evitar superposicion en moviles. Se controla con la clase `body.search-modal-open`.

---

## Sistema de Upload (R2)

El endpoint `/api/upload` acepta archivos via `FormData`:
- **Campo:** `file` (el archivo)
- **Campo opcional:** `product_type` (banner, logo, property, etc.) — afecta la ruta de almacenamiento en R2
- **Campo opcional:** `property_id` — para imagenes de inmuebles
- **Tipos permitidos:** image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime
- **Tamano maximo:** 50MB
- **Auth:** Bearer JWT requerido
- **R2 key pattern:** `{R2_FOLDER}/{product_type}/{timestamp}_{filename}`
- **Respuesta:** `{ url: "/api/serve?key=...", key: "..." }`

Las imagenes se sirven via `/api/serve?key=...` que lee desde R2.

---

## Sitemap y SEO

- **Sitemap dinamico:** `/sitemap.xml` → redirige a `/api/sitemap`
- Se genera en cada request (sin cache largo)
- Incluye: paginas estaticas, negocios aprobados (`/negocio/:slug`), productos aprobados (`/producto/:slug`)
- **Robots.txt dinamico:** `/robots.txt` → redirige a `/api/robots`
- Cada ficha de negocio/producto tiene meta tags SEO completos

---

## Sistema de Chat

- WebSocket en `/api/chat`
- Salas por negocio-usuario
- Mensajes en tiempo real
- Configurable: `all` (todos), `premium_only`, `none`
- Panel de chat para admin en `admin-chat.html`

---

## Despliegue

### Requisitos

- Cuenta de Cloudflare con Pages, D1 y R2 habilitados
- GitHub repo conectado a Cloudflare Pages
- Variables de entorno configuradas en Cloudflare

### Variables de Entorno (Cloudflare Pages)

| Variable | Descripcion |
|---|---|
| `JWT_SECRET` | Secreto para firmar JWT tokens |
| `OPENAI_API_KEY` | Clave API de OpenAI (para chatbot IA, opcional) |
| `GOOGLE_MAPS_KEY` | API key de Google Maps (geocoding, opcional) |

### Configuracion en Cloudflare

1. **D1 Database:** Binding name `DB` → base de datos creada en el dashboard de Cloudflare
2. **R2 Bucket:** Binding name `R2` (y/o `MEDIA_BUCKET`) → bucket creado en el dashboard
3. **Pages Project:** Conectado al repositorio de GitHub, rama `main`

### Flujo

```bash
git add -A
git commit -m "descripcion del cambio"
git push origin main
# Cloudflare Pages detecta el push y despliega automaticamente
# Verificar: https://aunclick.pages.dev
```

---

## Equipo de Desarrollo

- **Desarrollador:** @bboymak3
- **Plataforma:** Cloudflare Pages + D1 + R2
- **Repo:** [github.com/bboymak3/meridaunclick](https://github.com/bboymak3/meridaunclick)

---

## Licencia

Proyecto privado. Todos los derechos reservados.