// functions/negocio/[slug].js
// GET: Serve full business detail page at /negocio/:slug
// Injects window.__BUSINESS_ID and window.__BUSINESS_SLUG before scripts
// Falls back to ID-based lookup with 301 redirect to slug URL

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up business by slug
    const business = await env.DB.prepare(
      `SELECT 
        b.*,
        c.name as category_name,
        (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
        (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.slug = ? AND b.status = 'approved'`
    ).bind(slug).first();

    if (!business) {
      // Fallback: try by ID (some old links may use ?id= format)
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        const byId = await env.DB.prepare(
          `SELECT b.*, c.name as category_name,
            (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image
          FROM businesses b
          LEFT JOIN categories c ON b.category_id = c.id
          WHERE b.id = ? AND b.status = 'approved'`
        ).bind(numericSlug).first();
        if (byId && byId.slug) {
          return new Response('', {
            status: 301,
            headers: { 'Location': `/negocio/${byId.slug}` },
          });
        }
      }

      return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const baseUrl = 'https://aunclick.pages.dev';
    const title = business.title || 'Negocio';
    const description = business.description
      ? business.description.substring(0, 160)
      : `Información sobre ${title} en ${business.city || 'Venezuela'}. Dirección, contacto, servicios y más.`;
    const imageUrl = business.cover_image || `${baseUrl}/logo.png`;
    const canonicalUrl = `${baseUrl}/negocio/${business.slug}`;

    // We serve the same HTML as business.html but inject the business ID
    // so business-detail.js picks it up without needing ?id= in the URL
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)} - Un Click | Directorio de Negocios en Venezuela</title>
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph -->
    <meta property="og:type" content="business.business">
    <meta property="og:title" content="${escapeHtml(title)} - Un Click">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="Un Click">
    <meta property="og:locale" content="es_VE">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)} - Un Click">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Location -->
    <meta property="business:contact_data:street_address" content="${escapeHtml(business.address || '')}">
    <meta property="business:contact_data:locality" content="${escapeHtml(business.city || '')}">
    <meta property="business:contact_data:region" content="${escapeHtml(business.state || '')}">
    <meta property="business:contact_data:country_name" content="${escapeHtml(business.country || 'Venezuela')}">

    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>U</text></svg>">
    <style>
/* === Business Ficha - 30% Larger === */
.business-detail-page .compact-info-card {
    padding: 22px;
}
.business-detail-page .compact-title {
    font-size: 1.95rem;
    line-height: 1.35;
}
.business-detail-page .compact-address {
    font-size: 1.14rem;
    margin-bottom: 12px;
}
.business-detail-page .compact-address i {
    font-size: 1rem;
}
.business-detail-page .feature-chips {
    gap: 10px;
    margin-bottom: 14px;
}
.business-detail-page .feature-chip {
    padding: 8px 15px;
    font-size: 0.95rem;
    gap: 7px;
}
.business-detail-page .feature-chip i {
    font-size: 1rem;
}
.business-detail-page .compact-description {
    font-size: 1.05rem;
    line-height: 1.75;
}
.business-detail-page .compact-description.collapsed {
    max-height: 104px;
}
.business-detail-page .compact-description.collapsed::after {
    height: 52px;
}
.business-detail-page .compact-top-row {
    margin-bottom: 8px;
}
.business-detail-page .btn-favorite {
    width: 40px;
    height: 40px;
    font-size: 1.15rem;
}
.business-detail-page .compact-price {
    font-size: 2.4rem;
}
.business-detail-page .description-toggle {
    font-size: 1rem;
}
.business-detail-page .business-section-title {
    font-size: 1.3rem;
}

/* Top spacing for ficha */
.business-detail-page .business-content {
    padding-top: 10px;
}

/* === Compact Business Cards (for similar businesses) === */
.business-detail-page .business-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
.business-detail-page .business-card {
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
}
.business-detail-page .business-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
}
.business-detail-page .business-card-image {
    height: 120px;
    overflow: hidden;
    position: relative;
}
.business-detail-page .business-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.business-detail-page .business-card-badges {
    position: absolute;
    top: 6px;
    left: 6px;
    display: flex;
    gap: 4px;
    z-index: 2;
}
.business-detail-page .business-card-badges .card-badge {
    font-size: 0.58rem;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 600;
}
.business-detail-page .business-card-fav,
.business-detail-page .btn-share-wa-card {
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    background: rgba(255,255,255,0.9);
    border: none;
    cursor: pointer;
    z-index: 2;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.business-detail-page .business-card-fav { top: 6px; right: 38px; color: #e74c3c; }
.business-detail-page .btn-share-wa-card { top: 6px; right: 6px; color: #25d366; }
.business-detail-page .business-card-body {
    padding: 8px 10px 10px;
}
.business-detail-page .business-card-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 2px;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.business-detail-page .business-card-location {
    font-size: 0.65rem;
    color: #64748b;
    margin: 0 0 3px;
}
.business-detail-page .business-card-location i { font-size: 0.58rem; }
.business-detail-page .business-card-desc {
    font-size: 0.65rem;
    color: #94a3b8;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.business-detail-page .business-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
}

/* === Compact Product Cards (for business products) === */
.products-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
.product-card {
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
    text-decoration: none;
    color: inherit;
}
.product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
    border-color: #059669;
}
.product-card img {
    width: 100%;
    height: 120px;
    object-fit: cover;
}
.product-card-body {
    padding: 8px 10px 10px;
}
.product-card-name {
    font-weight: 600;
    font-size: 0.75rem;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #1e293b;
}
.product-card-price {
    color: #059669;
    font-weight: 700;
    font-size: 0.82rem;
}

/* Section styling */
.business-detail-page .section {
    margin-top: 24px;
}
.business-detail-page .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}
.business-detail-page .section-title {
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
}

/* Compact gallery */
.business-detail-page .gallery-main {
    aspect-ratio: 16/9;
    max-height: 300px;
}

@media (max-width: 640px) {
    .business-detail-page .business-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    .business-detail-page .business-card-image {
        height: 100px;
    }
    .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    .product-card img {
        height: 100px;
    }
}
.jobs-list .job-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 14px;
}
.job-item-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #eff6ff;
    color: #1a73e8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
}
.job-item-info {
    flex: 1;
    min-width: 0;
}
.job-item-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 2px;
}
.job-item-meta {
    font-size: 0.8rem;
    color: #6b7280;
}
.services-list .service-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 12px;
    border-left: 4px solid #f59e0b;
}
.service-item h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: #1f2937;
}
.service-item p {
    font-size: 0.88rem;
    color: #6b7280;
    line-height: 1.5;
    margin: 0;
}
.section-link {
    font-size: 0.85rem;
    color: #1a73e8;
    text-decoration: none;
    font-weight: 600;
}
.section-link:hover {
    text-decoration: underline;
}
</style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/index.html" class="nav-logo">
                <i class="fas fa-store"></i>
                <span class="brand-name"><i class="fas fa-map-marker-alt brand-location-icon" style="font-size:0.7em;opacity:0.6;"></i> <span id="brandCity"></span> Un Click</span>
            </a>
            <div class="location-selector" id="locationSelector">
                <button class="location-btn" id="locationBtn" aria-label="Seleccionar ubicación">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="location-label" id="locationLabel">Todo Venezuela</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="location-dropdown hidden" id="locationDropdown">
                    <div class="location-search">
                        <input type="text" id="locationSearchInput" placeholder="Buscar estado..." autocomplete="off">
                    </div>
                    <div class="location-option" data-state="" data-city="">
                        <i class="fas fa-globe-americas"></i>
                        <span>Todo Venezuela</span>
                    </div>
                    <div class="location-divider"></div>
                    <div class="location-list" id="locationList"></div>
                </div>
            </div>
            <button class="nav-toggle" id="navToggle" aria-label="Abrir menú">
                <i class="fas fa-bars"></i>
            </button>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/index.html" class="nav-link">Inicio</a></li>
                <li><a href="/search.html" class="nav-link">Negocios</a></li>
                <li><a href="/map.html" class="nav-link">Mapa</a></li>
                <li><a href="/entretenimiento.html" class="nav-link">Entretenimiento</a></li>
                <li><a href="/empleo.html" class="nav-link">Empleo</a></li>
                <li class="nav-dropdown">
                    <button class="nav-dropdown-toggle" aria-label="Más opciones">Más <i class="fas fa-chevron-down"></i></button>
                    <ul class="nav-dropdown-menu">
                        <li><a href="/marketplace.html" class="nav-link"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
                        <li class="nav-dropdown-divider"></li>
                        <li><a href="/emergencia.html" class="nav-link" style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Emergencias</a></li>
                    </ul>
                </li>
                <li id="navLoginItem"><a href="/login.html" class="nav-link nav-btn">Login</a></li>
                <li id="navUserItem" class="nav-user hidden">
                    <a href="/dashboard.html" class="nav-link" id="navUserName"><i class="fas fa-user-circle"></i> Mi Cuenta</a>
                    <button class="nav-link btn-logout" id="navLogout"><i class="fas fa-sign-out-alt"></i> Salir</button>
                </li>
                <li class="nav-mobile-cta">
                    <a href="/marketplace.html" class="nav-mobile-cta-marketplace"><i class="fas fa-shopping-bag"></i> Marketplace</a>
                </li>
            </ul>
        </div>
    </nav>

    <!-- Business Detail -->
    <main class="business-detail-page">
        <div class="container">
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <a href="/index.html"><i class="fas fa-home"></i> Inicio</a>
                <a href="/search.html">Negocios</a>
                <span id="breadcrumbTitle">${escapeHtml(title)}</span>
            </nav>

            <div class="loading-spinner" id="businessLoading">
                <i class="fas fa-spinner fa-spin fa-3x"></i>
                <p>Cargando negocio...</p>
            </div>

            <div class="error-state hidden" id="businessError">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <h2>Negocio no encontrado</h2>
                <p>El negocio que buscas no existe o ha sido eliminado.</p>
                <a href="/search.html" class="btn btn-primary">Explorar Negocios</a>
            </div>

            <div class="business-content hidden" id="businessContent">
                <div class="compact-info-card">
                    <div class="compact-top-row">
                        <div class="compact-price-row"><span id="propDetailBadges"></span></div>
                        <button class="btn-favorite" id="btnFavorite" aria-label="Agregar a favoritos" data-business-id=""><i class="far fa-heart"></i></button>
                    </div>
                    <h1 class="compact-title" id="propDetailTitle">${escapeHtml(title)}</h1>
                    <div class="compact-price" id="propDetailPrice" style="display:none;">--</div>
                    <div class="compact-address" id="propDetailLocation">
                        <i class="fas fa-map-marker-alt"></i> <span>${escapeHtml(business.city || '')}${business.state ? ', ' + escapeHtml(business.state) : ''}</span>
                    </div>
                    <div class="feature-chips">
                        <div class="feature-chip" id="statStateCityWrap" title="Estado / Ciudad"><i class="fas fa-map-marker-alt"></i> <span id="statStateCity">${escapeHtml((business.city || '') + (business.state ? ', ' + business.state : ''))}</span></div>
                        <div class="feature-chip" id="statCategoriaWrap" title="Categoría"><i class="fas fa-tag"></i> <span id="statCategoria">${escapeHtml(business.category_name || '--')}</span></div>
                        <div class="feature-chip" id="statScheduleWrap" style="display:none;" title="Horario"><i class="fas fa-clock"></i> <span id="statSchedule">--</span></div>
                        <div class="feature-chip" id="statPhoneWrap" style="display:none;" title="Teléfono"><i class="fas fa-phone"></i> <span id="statPhone">--</span></div>
                        <div class="feature-chip" id="statWhatsAppWrap" style="display:none;" title="WhatsApp"><i class="fab fa-whatsapp"></i> <span id="statWhatsApp">WhatsApp</span></div>
                        <div class="feature-chip" id="statFeatureParking" style="display:none;" title="Estacionamiento"><i class="fas fa-parking"></i> <span>Estacionamiento</span></div>
                        <div class="feature-chip" id="statFeatureWifi" style="display:none;" title="WiFi"><i class="fas fa-wifi"></i> <span>WiFi</span></div>
                        <div class="feature-chip" id="statFeatureCards" style="display:none;" title="Acepta tarjetas"><i class="fas fa-credit-card"></i> <span>Tarjetas</span></div>
                        <div class="feature-chip" id="statFeatureDelivery" style="display:none;" title="Delivery"><i class="fas fa-motorcycle"></i> <span>Delivery</span></div>
                        <div class="feature-chip" id="statFeatureOutdoor" style="display:none;" title="Área al aire libre"><i class="fas fa-umbrella-beach"></i> <span>Exterior</span></div>
                    </div>
                    <div class="compact-description collapsed" id="propDescription">
                        <p>${escapeHtml(business.description || 'Sin descripción disponible.')}</p>
                    </div>
                    <button class="description-toggle" id="descriptionToggle" style="display:none;">Leer más <i class="fas fa-chevron-down"></i></button>
                </div>

                <div class="business-gallery" id="businessGallery">
                    <div class="gallery-main">
                        <img id="mainImage" src="" alt="" class="gallery-main-img">
                        <button class="gallery-nav gallery-prev" id="galleryPrev" aria-label="Anterior"><i class="fas fa-chevron-left"></i></button>
                        <button class="gallery-nav gallery-next" id="galleryNext" aria-label="Siguiente"><i class="fas fa-chevron-right"></i></button>
                        <div class="gallery-counter"><span id="galleryCurrent">1</span> / <span id="galleryTotal">1</span></div>
                        <button class="gallery-fullscreen" id="galleryFullscreen" aria-label="Pantalla completa"><i class="fas fa-expand"></i></button>
                        <div class="gallery-badges" id="galleryBadges"></div>
                    </div>
                    <div class="gallery-thumbnails" id="galleryThumbnails"></div>
                </div>

                <div class="business-section hidden" id="featuresSection">
                    <h2 class="business-section-title">Características</h2>
                    <div class="features-list" id="featuresList"></div>
                </div>

                <div class="business-section map-section-wrapper hidden" id="mapSection">
                    <h2 class="business-section-title">Ubicación</h2>
                    <div class="business-map" id="businessMap"></div>
                    <button class="open-map-modal-btn" id="openMapModalBtn"><i class="fas fa-expand"></i> Ver en Mapa Completo</button>
                </div>

                <div class="business-section contact-section">
                    <h2 class="business-section-title">Contactar al Negocio</h2>
                    <div class="contact-actions" id="contactActions">
                        <a href="#" class="btn btn-whatsapp btn-full btn-lg" id="mainWhatsApp" style="display:none;" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>
                        <button class="btn btn-primary btn-full btn-lg" id="openChatBtn" style="margin-top:8px;"><i class="fas fa-comment-dots"></i> Enviar Mensaje</button>
                        <button class="btn btn-share-wa btn-full btn-lg" id="shareWhatsAppBtn" style="margin-top:8px;"><i class="fab fa-whatsapp"></i> Compartir por WhatsApp</button>
                    </div>
                </div>

                ${(() => { const instagram = business.instagram; const facebook = business.facebook; const twitter = business.twitter; const tiktok = business.tiktok; const youtube = business.youtube; if (!instagram && !facebook && !twitter && !tiktok && !youtube) return ''; return `
                <div class="pd-social-section" style="padding:16px 20px;">
                  <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-share-nodes" style="color:#059669;"></i> Redes Sociales
                  </div>
                  <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${instagram ? `<a href="${escapeHtml(instagram)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
                    ${facebook ? `<a href="${escapeHtml(facebook)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:12px;background:#1877f2;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="fab fa-facebook-f"></i> Facebook</a>` : ''}
                    ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:12px;background:#000;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="fab fa-x-twitter"></i> X (Twitter)</a>` : ''}
                    ${tiktok ? `<a href="${escapeHtml(tiktok)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:12px;background:#010101;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="fab fa-tiktok"></i> TikTok</a>` : ''}
                    ${youtube ? `<a href="${escapeHtml(youtube)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:12px;background:#ff0000;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="fab fa-youtube"></i> YouTube</a>` : ''}
                  </div>
                </div>`; })()}

                ${(() => { const video_url = business.video_url; if (!video_url) return ''; return `
                <div style="padding:16px 20px;">
                  <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-play-circle" style="color:#059669;"></i> Video
                  </div>
                  <div style="max-width:320px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                    ${getVideoEmbed(video_url)}
                  </div>
                </div>`; })()}

                <section class="business-section" id="productsSection" style="display:none;">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h2 class="business-section-title"><i class="fas fa-boxes-stacked" style="color:#059669;"></i> Productos</h2>
                        <a href="/marketplace.html" class="section-link" id="viewAllProducts">Ver más <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="products-grid" id="businessProductsGrid"></div>
                </section>

                <section class="business-section" id="jobsSection" style="display:none;">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h2 class="business-section-title"><i class="fas fa-briefcase" style="color:#1a73e8;"></i> Empleo</h2>
                        <a href="/empleo.html" class="section-link" id="viewAllJobs">Ver más <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="jobs-list" id="businessJobsList"></div>
                </section>

                <section class="business-section" id="servicesSection" style="display:none;">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h2 class="business-section-title"><i class="fas fa-concierge-bell" style="color:#f59e0b;"></i> Servicios</h2>
                    </div>
                    <div class="services-list" id="businessServicesList"></div>
                </section>
            </div>

            <section class="section hidden" id="similarSection">
                <div class="section-header">
                    <h2 class="section-title">Negocios Similares</h2>
                    <a href="/search.html" class="section-link">Ver más <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="business-grid" id="similarGrid"></div>
            </section>
        </div>
    </main>

    <div class="lightbox hidden" id="lightbox">
        <button class="lightbox-close" id="lightboxClose">&times;</button>
        <button class="lightbox-nav lightbox-prev" id="lightboxPrev"><i class="fas fa-chevron-left"></i></button>
        <img id="lightboxImage" src="" alt="" class="lightbox-img">
        <button class="lightbox-nav lightbox-next" id="lightboxNext"><i class="fas fa-chevron-right"></i></button>
        <div class="lightbox-counter" id="lightboxCounter"></div>
    </div>

    <div class="map-modal" id="mapModal">
        <div class="map-modal-header">
            <h3><i class="fas fa-map-marker-alt"></i> Ubicación del Negocio</h3>
            <button class="map-modal-close" id="mapModalClose" aria-label="Cerrar mapa"><i class="fas fa-times"></i></button>
        </div>
        <div class="map-modal-body"><div id="mapModalMap"></div></div>
    </div>

    <div class="toast-container" id="toastContainer"></div>
    <span id="statAreaLabel" class="hidden"></span>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="/js/app.js"></script>
    <script>window.__BUSINESS_ID = ${business.id}; window.__BUSINESS_SLUG = '${escapeJs(business.slug)}';</script>
    <script src="/js/business-detail.js"></script>
    <script src="/js/chat.js"></script>
    <script src="/js/review-widget.js"></script>
    <script src="/js/ai-chatbot.js"></script>
    <script>setTimeout(function(){fetch('/api/business-stats/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:${business.id},event_type:'view',source:'ficha'})}).catch(function(){})},0);</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Link': `<${canonicalUrl}>; rel="canonical"`,
      },
    });
  } catch (error) {
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '');
}

function getVideoEmbed(url) {
  if (!url) return '';
  // YouTube: youtube.com/watch?v=XXX or youtu.be/XXX
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // TikTok: tiktok.com/@user/video/XXX
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `<iframe src="https://www.tiktok.com/embed/v2/${ttMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // Other URLs: use as-is
  return `<iframe src="${escapeHtml(url)}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
}
