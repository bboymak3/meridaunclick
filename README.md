# Un Click - Directorio Nacional de Negocios de Venezuela

> Plataforma web progresiva (PWA) para descubrir, registrar y gestionar negocios en Venezuela. Incluye directorio con mapa interactivo, marketplace de productos, bolsa de empleo, reservas, cupones y más.

**URL en producción:** [https://aunclick.pages.dev](https://aunclick.pages.dev)

---

## Características Principales

- **Directorio de Negocios** — Búsqueda por categoría, estado/ciudad, tipo de negocio. Fichas detalladas con galería, mapa, servicios, productos y contactos por WhatsApp.
- **Mapa Interactivo** — Visualización geolocalizada de negocios con Leaflet/OpenStreetMap.
- **Marketplace** — Publicación y búsqueda de productos con filtros por categoría, precio y novedad. Contacto directo por WhatsApp.
- **Bolsa de Empleo** — Publicación de ofertas laborales vinculadas a negocios.
- **Gestión de Servicios** — Cada negocio puede registrar los servicios que ofrece, editables desde el panel del usuario.
- **Reservas y Cupones** — Módulos para reservar citas y gestionar cupones/promociones.
- **Entretenimiento y Eventos** — Directorio de opciones de entretenimiento.
- **Emergencias** — Directorio de números de emergencia por estado.
- **PWA (Progressive Web App)** — Instalable en móvil y escritorio. Funciona offline con Service Worker.
- **Panel de Usuario** — Dashboard para gestionar negocios, productos, mensajes, favoritos y perfil.
- **Panel de Administración** — Aprobación de negocios pendientes, gestión de usuarios y contenido.
- **IA Chatbot** — Asistente virtual integrado para ayudar a los usuarios.

---

## Arquitectura Técnica

### Stack

| Componente | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) |
| Backend | Cloudflare Pages Functions (serverless) |
| Base de Datos | Cloudflare D1 (SQLite) |
| Almacenamiento | Cloudflare R2 (objetos/imágenes) |
| Mapas | Leaflet + OpenStreetMap |
| Autenticación | JWT (JSON Web Tokens) |
| Cache | Service Worker (cache-first + stale-while-revalidate) |
| Despliegue | Cloudflare Pages (CI/CD desde GitHub) |

### Estructura del Proyecto

```
meridaunclick/
├── index.html              # Página principal (homepage)
├── search.html             # Búsqueda de negocios
├── map.html                # Mapa interactivo
├── business.html           # Ficha de negocio (detalle dinámico)
├── new-business.html       # Registro de nuevo negocio
├── marketplace.html        # Marketplace de productos
├── empleo.html             # Bolsa de empleo
├── entretenimiento.html    # Entretenimiento
├── eventos.html            # Eventos
├── reservas.html           # Reservas
├── cupones.html            # Cupones y promociones
├── emergencia.html         # Emergencias
├── dashboard.html          # Panel del usuario
├── login.html              # Login / Registro
├── admin.html              # Panel de administración
├── privacidad.html         # Política de privacidad
├── eliminacion-datos.html  # Eliminación de datos (GDPR)
├── manifest.json           # PWA Manifest
├── sw.js                   # Service Worker
├── robots.txt              # Robots.txt (estático)
├── _redirects              # Redirecciones Cloudflare Pages
├── _headers                # Headers de seguridad Cloudflare Pages
├── wrangler.toml           # Configuración Cloudflare
│
├── css/
│   └── styles.css          # Estilos principales (todo en un archivo)
│
├── js/
│   ├── app.js              # Módulo principal (API, auth, UI helpers, nav)
│   ├── dashboard.js        # Dashboard y gestión de usuario
│   ├── admin.js            # Panel de administración
│   ├── business-detail.js  # Ficha de negocio
│   ├── business-form.js    # Formulario de registro de negocio
│   ├── auth.js             # Login y registro
│   ├── chat.js             # Chat en tiempo real
│   ├── review-widget.js    # Widget de reseñas
│   ├── ai-chatbot.js       # Chatbot con IA
│   ├── home-map.js         # Mapa de la homepage
│   └── map.js              # Página de mapa completo
│
├── functions/
│   └── api/
│       ├── auth/           # Autenticación (login, register, promote-me)
│       ├── businesses/     # CRUD de negocios
│       │   └── [id]/
│       │       ├── services/  # CRUD de servicios por negocio
│       │       ├── approve.js
│       │       └── reject.js
│       ├── categories/     # Categorías de negocios
│       ├── contacts/       # Formulario de contacto
│       ├── favorites/      # Sistema de favoritos
│       ├── images/         # Gestión de imágenes
│       ├── jobs/           # Ofertas de empleo
│       ├── marketplace/    # CRUD de productos
│       ├── messages/       # Mensajería
│       ├── reviews/        # Reseñas
│       ├── search/         # Búsqueda avanzada
│       ├── settings/       # Configuración del admin
│       ├── sitemap/        # Sitemap XML dinámico
│       ├── robots/         # Robots.txt dinámico
│       ├── states/         # Lista de estados venezolanos
│       ├── upload/         # Subida de archivos a R2
│       └── users/          # Gestión de usuarios
│
└── assets/                 # Imágenes y recursos estáticos
```

### Base de Datos (D1)

**Tablas principales:**

| Tabla | Descripción |
|---|---|
| `users` | Usuarios (nombre, email, teléfono, rol) |
| `businesses` | Negocios (título, descripción, categoría, ubicación, coordenadas) |
| `business_services` | Servicios por negocio |
| `images` | Imágenes de negocios (gallery) |
| `products` | Productos del marketplace |
| `jobs` | Ofertas de empleo |
| `contacts` | Mensajes de contacto |
| `favorites` | Negocios favoritos por usuario |
| `reviews` | Reseñas de negocios |
| `categories` | Categorías de negocios |
| `admin_settings` | Configuración del panel admin |

---

## APIs Principales

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/auth/login` | POST | Inicio de sesión |
| `/api/auth/register` | POST | Registro de usuario |
| `/api/businesses` | GET | Listar/buscar negocios |
| `/api/businesses` | POST | Crear negocio (auth) |
| `/api/businesses/:id` | GET | Detalle de negocio |
| `/api/businesses/:id` | PUT | Editar negocio (owner/admin) |
| `/api/businesses/:id/services` | GET/POST | Listar/crear servicios |
| `/api/businesses/:id/services/:sid` | PUT/DELETE | Editar/eliminar servicio |
| `/api/marketplace` | GET | Listar productos |
| `/api/marketplace` | POST | Crear producto (auth) |
| `/api/marketplace/:id` | PUT/DELETE | Editar/eliminar producto |
| `/api/jobs` | GET/POST | Ofertas de empleo |
| `/api/favorites` | GET/POST/DELETE | Favoritos |
| `/api/sitemap` | GET | Sitemap XML dinámico |
| `/api/robots` | GET | Robots.txt dinámico |
| `/api/upload` | POST | Subir imagen a R2 |

---

## Despliegue

### Requisitos

- Node.js 18+
- Cuenta de Cloudflare con Pages, D1 y R2 habilitados
- GitHub token para CI/CD

### Configuración

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/bboymak3/meridaunclick.git
   cd meridaunclick
   ```

2. Configurar D1 (si es nuevo):
   ```bash
   wrangler d1 create generico_db
   ```

3. Configurar R2 bucket:
   ```bash
   wrangler r2 bucket create my-emdash-media
   ```

4. Variables de entorno sensibles (NO en wrangler.toml):
   ```bash
   wrangler secret put JWT_SECRET
   ```

5. Desplegar:
   ```bash
   wrangler pages deploy .
   ```

O hacer push a GitHub y Cloudflare Pages desplegará automáticamente.

---

## Equipo de Desarrollo

- **Desarrollador:** @bboymak3
- **Plataforma:** Cloudflare Pages + D1 + R2
- **Repo:** [github.com/bboymak3/meridaunclick](https://github.com/bboymak3/meridaunclick)

---

## Licencia

Proyecto privado. Todos los derechos reservados.
