// functions/landing/[slug].js
// GET: Standalone landing page for a business at /landing/:slug
// Single-page, SEO-friendly, shareable landing with all business info

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Business data
    const business = await env.DB.prepare(
      `SELECT 
        b.*,
        c.name as category_name,
        (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.slug = ? AND b.status = 'approved'`
    ).bind(slug).first();

    if (!business) {
      return new Response('<h1>Negocio no encontrado</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Products
    const products = await env.DB.prepare(
      `SELECT id, name, price, slug, image, description
       FROM products WHERE business_id = ? AND status = 'approved'
       ORDER BY sort_order ASC, created_at DESC LIMIT 12`
    ).bind(business.id).all();

    // Images gallery
    const images = await env.DB.prepare(
      `SELECT url, is_cover FROM images WHERE business_id = ? ORDER BY is_cover DESC, id ASC LIMIT 10`
    ).bind(business.id).all();

    const baseUrl = 'https://aunclick.pages.dev';
    const title = business.title || 'Negocio';
    const description = business.description
      ? business.description.substring(0, 160)
      : `Visita ${title} - ${business.category_name || 'Negocio'} en ${business.city || 'Venezuela'}`;
    const imageUrl = business.cover_image || `${baseUrl}/logo.png`;
    const whatsappNumber = (business.whatsapp || business.phone || '').replace(/[^0-9]/g, '');
    const whatsappLink = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, vi tu perfil en Un Click y me interesa tu negocio ' + title)}`
      : '#';
    const phoneClean = (business.phone || '').replace(/[^0-9]/g, '');
    const mapQuery = encodeURIComponent(`${business.address || ''} ${business.city || ''} ${business.state || ''} Venezuela`);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)} - Landing Page | Un Click Venezuela</title>
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${baseUrl}/landing/${business.slug}">

    <!-- Open Graph -->
    <meta property="og:type" content="business.business">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${baseUrl}/landing/${business.slug}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1a1a2e;
            line-height: 1.6;
            background: #fff;
        }
        a { text-decoration: none; color: inherit; }

        /* === NAV === */
        .lp-nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid #e5e7eb;
            padding: 12px 20px;
            display: flex; align-items: center; justify-content: space-between;
            transition: box-shadow 0.3s;
        }
        .lp-nav.scrolled { box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
        .lp-nav-brand {
            font-size: 1.1rem; font-weight: 700; color: #059669;
            display: flex; align-items: center; gap: 6px;
        }
        .lp-nav-brand i { font-size: 1.3rem; }
        .lp-nav-links { display: flex; gap: 20px; align-items: center; }
        .lp-nav-links a {
            font-size: 0.85rem; font-weight: 600; color: #64748b;
            transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: #059669; }
        .lp-nav-cta {
            background: #25d366 !important; color: #fff !important;
            padding: 8px 16px; border-radius: 8px;
            font-size: 0.85rem !important; font-weight: 600 !important;
            display: flex; align-items: center; gap: 6px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(37,211,102,0.3); }
        @media (max-width: 768px) {
            .lp-nav-links a:not(.lp-nav-cta) { display: none; }
        }

        /* === HERO === */
        .lp-hero {
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            position: relative; overflow: hidden;
            background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
            padding: 100px 20px 60px;
        }
        .lp-hero-bg {
            position: absolute; inset: 0;
            background-image: url('${business.cover_image || ''}');
            background-size: cover; background-position: center;
            opacity: 0.15;
        }
        .lp-hero-pattern {
            position: absolute; inset: 0; opacity: 0.05;
            background-image: radial-gradient(circle at 25px 25px, white 2%, transparent 0%);
            background-size: 50px 50px;
        }
        .lp-hero-content {
            position: relative; z-index: 2;
            text-align: center; max-width: 700px;
        }
        .lp-hero-badge {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
            padding: 8px 20px; border-radius: 50px;
            font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.9);
            margin-bottom: 24px;
        }
        .lp-hero-title {
            font-size: 3.2rem; font-weight: 800; color: #fff;
            line-height: 1.15; margin-bottom: 16px;
            letter-spacing: -0.5px;
        }
        .lp-hero-subtitle {
            font-size: 1.15rem; color: rgba(255,255,255,0.85);
            margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;
        }
        .lp-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .lp-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 14px 28px; border-radius: 12px;
            font-size: 1rem; font-weight: 700;
            transition: all 0.3s; border: none; cursor: pointer;
        }
        .lp-btn-whatsapp {
            background: #25d366; color: #fff;
            box-shadow: 0 4px 20px rgba(37,211,102,0.4);
        }
        .lp-btn-whatsapp:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(37,211,102,0.5); }
        .lp-btn-phone {
            background: rgba(255,255,255,0.15); color: #fff;
            backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.25);
        }
        .lp-btn-phone:hover { background: rgba(255,255,255,0.25); }
        .lp-btn-outline {
            background: transparent; color: #059669;
            border: 2px solid #059669;
        }
        .lp-btn-outline:hover { background: #059669; color: #fff; }

        @media (max-width: 768px) {
            .lp-hero { min-height: 90vh; padding: 80px 20px 40px; }
            .lp-hero-title { font-size: 2.2rem; }
            .lp-hero-subtitle { font-size: 1rem; }
            .lp-btn { padding: 12px 22px; font-size: 0.9rem; }
        }

        /* === SECTIONS === */
        .lp-section {
            padding: 80px 20px;
        }
        .lp-section:nth-child(even) { background: #f8fafb; }
        .lp-container { max-width: 900px; margin: 0 auto; }
        .lp-section-header {
            text-align: center; margin-bottom: 48px;
        }
        .lp-section-label {
            font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 2px; color: #059669; margin-bottom: 8px;
        }
        .lp-section-title {
            font-size: 2rem; font-weight: 800; color: #0f172a;
            line-height: 1.3; margin-bottom: 12px;
        }
        .lp-section-desc {
            font-size: 1rem; color: #64748b; max-width: 500px; margin: 0 auto;
        }

        /* === ABOUT === */
        .lp-about-content {
            text-align: center; max-width: 700px; margin: 0 auto;
        }
        .lp-about-text {
            font-size: 1.1rem; color: #475569; line-height: 1.8;
        }

        /* === INFO CARDS === */
        .lp-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px; margin-top: 32px;
        }
        .lp-info-card {
            background: #fff; border-radius: 16px; padding: 24px;
            border: 1px solid #e5e7eb;
            display: flex; align-items: flex-start; gap: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }
        .lp-info-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.2rem; flex-shrink: 0;
        }
        .lp-info-icon.green { background: #ecfdf5; color: #059669; }
        .lp-info-icon.blue { background: #eff6ff; color: #2563eb; }
        .lp-info-icon.amber { background: #fffbeb; color: #d97706; }
        .lp-info-icon.purple { background: #faf5ff; color: #7c3aed; }
        .lp-info-icon.red { background: #fef2f2; color: #dc2626; }
        .lp-info-icon.pink { background: #fdf2f8; color: #db2777; }
        .lp-info-card-label {
            font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;
            letter-spacing: 1px; font-weight: 600; margin-bottom: 2px;
        }
        .lp-info-card-value {
            font-size: 1rem; font-weight: 700; color: #0f172a;
        }
        .lp-info-card-value a { color: #059669; }
        .lp-info-card-value a:hover { text-decoration: underline; }

        /* === FEATURES === */
        .lp-features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
        }
        .lp-feature-item {
            text-align: center; padding: 28px 20px;
            background: #fff; border-radius: 16px;
            border: 1px solid #e5e7eb;
            transition: transform 0.2s;
        }
        .lp-feature-item:hover { transform: translateY(-3px); }
        .lp-feature-item i {
            font-size: 1.8rem; color: #059669; margin-bottom: 12px;
        }
        .lp-feature-item span {
            font-size: 0.9rem; font-weight: 600; color: #334155;
        }

        /* === PRODUCTS === */
        .lp-products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
        }
        .lp-product-card {
            background: #fff; border-radius: 16px; overflow: hidden;
            border: 1px solid #e5e7eb;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-product-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }
        .lp-product-img {
            width: 100%; height: 160px; object-fit: cover;
            background: #f1f5f9;
        }
        .lp-product-body { padding: 16px; }
        .lp-product-name {
            font-size: 0.95rem; font-weight: 700; color: #0f172a;
            margin-bottom: 6px;
            display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden;
        }
        .lp-product-price {
            font-size: 1.1rem; font-weight: 800; color: #059669;
        }

        /* === GALLERY === */
        .lp-gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
        }
        .lp-gallery-img {
            width: 100%; height: 180px; object-fit: cover;
            border-radius: 12px; cursor: pointer;
            transition: transform 0.3s;
        }
        .lp-gallery-img:hover { transform: scale(1.03); }

        /* === MAP === */
        .lp-map-container {
            border-radius: 16px; overflow: hidden;
            border: 1px solid #e5e7eb;
            height: 350px;
        }
        .lp-map-container iframe {
            width: 100%; height: 100%; border: none;
        }

        /* === CTA === */
        .lp-cta {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            text-align: center; color: #fff;
        }
        .lp-cta-title {
            font-size: 2rem; font-weight: 800; margin-bottom: 12px;
        }
        .lp-cta-text {
            font-size: 1.1rem; opacity: 0.9; margin-bottom: 32px;
            max-width: 500px; margin-left: auto; margin-right: auto;
        }
        .lp-cta-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* === FOOTER === */
        .lp-footer {
            background: #0f172a; color: #94a3b8;
            text-align: center; padding: 32px 20px;
            font-size: 0.85rem;
        }
        .lp-footer-brand { color: #059669; font-weight: 700; }
        .lp-footer a { color: #059669; }
        .lp-footer a:hover { text-decoration: underline; }
        .lp-footer-links { display: flex; gap: 20px; justify-content: center; margin-top: 12px; }

        /* === MOBILE CTA BAR === */
        .lp-mobile-cta {
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
            background: #fff; border-top: 1px solid #e5e7eb;
            padding: 12px 20px; display: none;
            gap: 10px;
        }
        .lp-mobile-cta a {
            flex: 1; text-align: center; padding: 12px;
            border-radius: 10px; font-size: 0.85rem; font-weight: 700;
            display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .lp-mobile-cta .wa-btn { background: #25d366; color: #fff; }
        .lp-mobile-cta .call-btn { background: #059669; color: #fff; }
        @media (max-width: 768px) {
            .lp-mobile-cta { display: flex; }
            .lp-section { padding: 60px 20px; }
            .lp-cta { padding-bottom: 80px; }
        }
    </style>
</head>
<body>

<!-- NAV -->
<nav class="lp-nav" id="lpNav">
    <a href="${baseUrl}/index.html" class="lp-nav-brand">
        <i class="fas fa-store"></i> Un Click
    </a>
    <div class="lp-nav-links">
        <a href="#about">Nosotros</a>
        <a href="#products">${products.results.length > 0 ? 'Productos' : ''}</a>
        <a href="#gallery">${images.results.length > 1 ? 'Galeria' : ''}</a>
        <a href="#contact">Contacto</a>
        ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-nav-cta"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
    </div>
</nav>

<!-- HERO -->
<section class="lp-hero" id="hero">
    ${business.cover_image ? '<div class="lp-hero-bg"></div>' : ''}
    <div class="lp-hero-pattern"></div>
    <div class="lp-hero-content">
        <div class="lp-hero-badge">
            <i class="fas fa-map-marker-alt"></i>
            ${escapeHtml(business.city || '')}${business.state ? ', ' + escapeHtml(business.state) : ''}
        </div>
        <h1 class="lp-hero-title">${escapeHtml(title)}</h1>
        <p class="lp-hero-subtitle">${escapeHtml(business.description || business.category_name || 'Conoce nuestros servicios y productos')}</p>
        <div class="lp-hero-actions">
            ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-btn lp-btn-whatsapp"><i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>` : ''}
            ${phoneClean ? `<a href="tel:${phoneClean}" class="lp-btn lp-btn-phone"><i class="fas fa-phone"></i> ${escapeHtml(business.phone || '')}</a>` : ''}
        </div>
    </div>
</section>

<!-- ABOUT -->
${business.description ? `
<section class="lp-section" id="about">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Sobre Nosotros</div>
            <h2 class="lp-section-title">Conoce ${escapeHtml(title)}</h2>
        </div>
        <div class="lp-about-content">
            <p class="lp-about-text">${escapeHtml(business.description)}</p>
        </div>
    </div>
</section>
` : ''}

<!-- INFO -->
<section class="lp-section">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Informacion</div>
            <h2 class="lp-section-title">Datos del Negocio</h2>
        </div>
        <div class="lp-info-grid">
            <div class="lp-info-card">
                <div class="lp-info-icon green"><i class="fas fa-map-marker-alt"></i></div>
                <div>
                    <div class="lp-info-card-label">Direccion</div>
                    <div class="lp-info-card-value">${escapeHtml(business.address || business.city || 'No disponible')}</div>
                </div>
            </div>
            ${business.category_name ? `
            <div class="lp-info-card">
                <div class="lp-info-icon blue"><i class="fas fa-tag"></i></div>
                <div>
                    <div class="lp-info-card-label">Categoria</div>
                    <div class="lp-info-card-value">${escapeHtml(business.category_name)}</div>
                </div>
            </div>` : ''}
            ${business.phone ? `
            <div class="lp-info-card">
                <div class="lp-info-icon amber"><i class="fas fa-phone"></i></div>
                <div>
                    <div class="lp-info-card-label">Telefono</div>
                    <div class="lp-info-card-value"><a href="tel:${phoneClean}">${escapeHtml(business.phone)}</a></div>
                </div>
            </div>` : ''}
            ${business.whatsapp ? `
            <div class="lp-info-card">
                <div class="lp-info-icon green"><i class="fab fa-whatsapp"></i></div>
                <div>
                    <div class="lp-info-card-label">WhatsApp</div>
                    <div class="lp-info-card-value"><a href="${whatsappLink}" target="_blank" rel="noopener">${escapeHtml(business.whatsapp)}</a></div>
                </div>
            </div>` : ''}
            ${business.schedule ? `
            <div class="lp-info-card">
                <div class="lp-info-icon purple"><i class="fas fa-clock"></i></div>
                <div>
                    <div class="lp-info-card-label">Horario</div>
                    <div class="lp-info-card-value">${escapeHtml(business.schedule)}</div>
                </div>
            </div>` : ''}
            ${business.email || business.email_contact ? `
            <div class="lp-info-card">
                <div class="lp-info-icon red"><i class="fas fa-envelope"></i></div>
                <div>
                    <div class="lp-info-card-label">Email</div>
                    <div class="lp-info-card-value"><a href="mailto:${escapeHtml(business.email_contact || business.email)}">${escapeHtml(business.email_contact || business.email)}</a></div>
                </div>
            </div>` : ''}
            ${business.website ? `
            <div class="lp-info-card">
                <div class="lp-info-icon pink"><i class="fas fa-globe"></i></div>
                <div>
                    <div class="lp-info-card-label">Sitio Web</div>
                    <div class="lp-info-card-value"><a href="${escapeHtml(business.website)}" target="_blank" rel="noopener">${escapeHtml(business.website.replace(/^https?:\/\//, ''))}</a></div>
                </div>
            </div>` : ''}
        </div>
    </div>
</section>

<!-- FEATURES -->
${(business.has_parking || business.has_wifi || business.has_card || business.has_delivery || business.has_outdoor) ? `
<section class="lp-section">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Servicios</div>
            <h2 class="lp-section-title">Lo Que Ofrecemos</h2>
        </div>
        <div class="lp-features-grid">
            ${business.has_parking ? '<div class="lp-feature-item"><i class="fas fa-parking"></i><span>Estacionamiento</span></div>' : ''}
            ${business.has_wifi ? '<div class="lp-feature-item"><i class="fas fa-wifi"></i><span>WiFi Gratis</span></div>' : ''}
            ${business.has_card ? '<div class="lp-feature-item"><i class="fas fa-credit-card"></i><span>Tarjetas</span></div>' : ''}
            ${business.has_delivery ? '<div class="lp-feature-item"><i class="fas fa-motorcycle"></i><span>Delivery</span></div>' : ''}
            ${business.has_outdoor ? '<div class="lp-feature-item"><i class="fas fa-umbrella-beach"></i><span>Zona Exterior</span></div>' : ''}
        </div>
    </div>
</section>
` : ''}

<!-- PRODUCTS -->
${products.results.length > 0 ? `
<section class="lp-section" id="products">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Productos</div>
            <h2 class="lp-section-title">Nuestros Productos</h2>
        </div>
        <div class="lp-products-grid">
            ${products.results.map(p => `
                <div class="lp-product-card">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="lp-product-img" loading="lazy" onerror="this.style.display='none'">` : '<div style="height:160px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="font-size:2rem;color:#cbd5e1;"></i></div>'}
                    <div class="lp-product-body">
                        <div class="lp-product-name">${escapeHtml(p.name)}</div>
                        ${p.price ? `<div class="lp-product-price">${escapeHtml(String(p.price))}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</section>
` : ''}

<!-- GALLERY -->
${images.results.length > 1 ? `
<section class="lp-section" id="gallery">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Galeria</div>
            <h2 class="lp-section-title">Nuestras Fotos</h2>
        </div>
        <div class="lp-gallery-grid">
            ${images.results.map((img, i) => `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(title)} foto ${i + 1}" class="lp-gallery-img" loading="lazy">`).join('')}
        </div>
    </div>
</section>
` : ''}

<!-- MAP -->
${(business.lat || business.latitude) ? `
<section class="lp-section" id="location">
    <div class="lp-container">
        <div class="lp-section-header">
            <div class="lp-section-label">Ubicacion</div>
            <h2 class="lp-section-title">Como Llegar</h2>
        </div>
        <div class="lp-map-container">
            <iframe
                src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=15"
                allowfullscreen loading="lazy"
                referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        </div>
    </div>
</section>
` : ''}

<!-- CTA -->
<section class="lp-section lp-cta" id="contact">
    <div class="lp-container">
        <h2 class="lp-cta-title">Quieres contactar a ${escapeHtml(title)}?</h2>
        <p class="lp-cta-text">Escribenos ahora por WhatsApp o llamanos directamente. Te respondemos rapido.</p>
        <div class="lp-cta-buttons">
            ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-btn lp-btn-whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
            ${phoneClean ? `<a href="tel:${phoneClean}" class="lp-btn lp-btn-outline" style="border-color:#fff;color:#fff;"><i class="fas fa-phone"></i> Llamar</a>` : ''}
        </div>
    </div>
</section>

<!-- FOOTER -->
<footer class="lp-footer">
    <p>Landing page de <span class="lp-footer-brand">${escapeHtml(title)}</span> en <a href="${baseUrl}" target="_blank">Un Click</a></p>
    <div class="lp-footer-links">
        <a href="${baseUrl}/negocio/${business.slug}" target="_blank">Ver en Un Click</a>
        ${business.instagram ? `<a href="${escapeHtml(business.instagram)}" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
        ${business.facebook ? `<a href="${escapeHtml(business.facebook)}" target="_blank" rel="noopener"><i class="fab fa-facebook"></i> Facebook</a>` : ''}
    </div>
</footer>

<!-- MOBILE CTA BAR -->
<div class="lp-mobile-cta">
    ${whatsappNumber ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="wa-btn"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
    ${phoneClean ? `<a href="tel:${phoneClean}" class="call-btn"><i class="fas fa-phone"></i> Llamar</a>` : ''}
</div>

<script>
// Sticky nav shadow on scroll
window.addEventListener('scroll', () => {
    const nav = document.getElementById('lpNav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});
</script>

</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Link': `<${baseUrl}/landing/${business.slug}>; rel="canonical"`,
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
