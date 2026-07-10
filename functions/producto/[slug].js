// functions/producto/[slug].js
// GET: Serve SEO-optimized product detail page at /producto/:slug
// Product ficha + business info + 3 related products

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up product by slug with full business info
    const product = await env.DB.prepare(
      `SELECT p.*, 
              b.title as business_name, b.slug as business_slug, b.city, b.state,
              b.phone as business_phone, b.whatsapp as business_whatsapp,
              b.instagram as business_instagram, b.facebook as business_facebook,
              b.twitter as business_twitter, b.tiktok as business_tiktok,
              b.youtube as business_youtube, b.video_url as business_video_url
       FROM products p
       LEFT JOIN businesses b ON p.business_id = b.id
       WHERE p.slug = ? AND (p.status = 'approved' OR p.status IS NULL)`
    ).bind(slug).first();

    if (!product) {
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        const byId = await env.DB.prepare(
          `SELECT p.*, b.title as business_name, b.slug as business_slug,
                  b.city, b.state, b.whatsapp as business_whatsapp,
                  b.instagram as business_instagram, b.facebook as business_facebook,
                  b.twitter as business_twitter, b.tiktok as business_tiktok,
                  b.youtube as business_youtube, b.video_url as business_video_url
           FROM products p
           LEFT JOIN businesses b ON p.business_id = b.id
           WHERE p.id = ? AND (p.status = 'approved' OR p.status IS NULL)`
        ).bind(numericSlug).first();
        if (byId && byId.slug) {
          return new Response('', {
            status: 301,
            headers: { 'Location': `/producto/${byId.slug}` },
          });
        }
      }

      return new Response('<h1>Producto no encontrado</h1><p>El producto que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const baseUrl = 'https://holax.com';
    const title = product.name || 'Producto';
    const price = product.price ? `$${Number(product.price).toLocaleString('es-VE')}` : '';
    const description = product.description
      ? product.description.substring(0, 160)
      : `${title}${price ? ' - ' + price : ''} - Disponible en HOLAX Marketplace, Venezuela.`;
    const imageUrl = product.image || `${baseUrl}/logo.png`;
    const canonicalUrl = `${baseUrl}/producto/${product.slug}`;

    // Fetch 3 related products - try same category first, fallback to same business, then any
    let relatedProducts = [];
    try {
      // 1) Same category, different product
      if (product.category) {
        const byCategory = await env.DB.prepare(
          `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
           FROM products p
           WHERE p.category = ? AND p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
           ORDER BY RANDOM() LIMIT 3`
        ).bind(product.category, product.id).all();
        relatedProducts = byCategory.results || [];
      }
      // 2) Fallback: same business if no category matches
      if (relatedProducts.length === 0 && product.business_id) {
        const byBusiness = await env.DB.prepare(
          `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
           FROM products p
           WHERE p.business_id = ? AND p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
           ORDER BY RANDOM() LIMIT 3`
        ).bind(product.business_id, product.id).all();
        relatedProducts = byBusiness.results || [];
      }
      // 3) Fallback: any other approved products
      if (relatedProducts.length === 0) {
        const anyProducts = await env.DB.prepare(
          `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
           FROM products p
           WHERE p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
           ORDER BY RANDOM() LIMIT 3`
        ).bind(product.id).all();
        relatedProducts = anyProducts.results || [];
      }
    } catch(e) {
      console.error('Related products error:', e);
    }

    const catBadge = getCatBadge(product.category);
    const catLabel = getCatLabel(product.category);
    const catIcon = getCatIcon(product.category);
    const waNumber = product.business_whatsapp ? product.business_whatsapp.replace(/[^0-9]/g, '') : '';
    const waMsg = encodeURIComponent('Hola, estoy interesado en: ' + product.name);
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : '';
    const bizLink = product.business_slug ? `/negocio/${product.business_slug}` : '';

    // Build related products HTML (compact cards)
    let relatedHtml = '';
    if (relatedProducts.length > 0) {
      const cards = relatedProducts.map(rp => {
        const rpPrice = rp.price ? `$${Number(rp.price).toLocaleString('es-VE')}` : '';
        const rpSlug = rp.slug || rp.id;
        const rpBadge = getCatBadge(rp.category);
        const rpIcon = getCatIcon(rp.category);
        return `
          <a href="/producto/${rpSlug}" class="rp-card">
            <div class="rp-card-img">
              ${rp.image ? `<img src="${esc(rp.image)}" alt="${esc(rp.name)}" loading="lazy">` : `<div class="rp-card-ph"><i class="fas fa-image"></i></div>`}
              <span class="rp-badge ${rpBadge}"><i class="fas ${rpIcon}"></i></span>
            </div>
            <div class="rp-card-body">
              <div class="rp-card-name">${esc(rp.name)}</div>
              ${rpPrice ? `<div class="rp-card-price">${rpPrice}</div>` : ''}
            </div>
          </a>`;
      }).join('');

      relatedHtml = `
        <div class="pd-section-related">
          <div class="pd-section-title"><i class="fas fa-boxes-stacked"></i> Productos Relacionados</div>
          <div class="rp-grid">${cards}</div>
        </div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}${price ? ' - ' + price : ''} - HOLAX Marketplace</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="product">
    <meta property="og:title" content="${esc(title)}${price ? ' - ' + price : ''}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="HOLAX Marketplace">
    <meta property="og:locale" content="es_VE">
    <meta property="product:price:amount" content="${product.price || '0'}">
    <meta property="product:price:currency" content="USD">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)} - HOLAX">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="manifest" href="/manifest.json">
    <style>
        * { box-sizing:border-box; }
        body { background:#f5f5f5; margin:0; font-family:system-ui,-apple-system,sans-serif; }

        /* === NAVBAR (matching main site) === */
        .navbar { background:#fff; position:sticky; top:0; z-index:1000; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
        .nav-container { max-width:1200px; margin:0 auto; padding:0 16px; display:flex; align-items:center; justify-content:space-between; height:60px; position:relative; }
        .nav-logo { display:flex; align-items:center; gap:8px; text-decoration:none; font-size:1.3rem; font-weight:800; color:#1a73e8; flex-shrink:0; }
        .nav-logo:hover { opacity:0.9; }
        .nav-logo i { font-size:1.4rem; }
        .brand-name { font-size:1.2rem; font-weight:800; }
        .nav-toggle { display:none; background:none; border:none; font-size:1.4rem; color:#1e293b; cursor:pointer; padding:8px; }
        .nav-menu { display:flex; align-items:center; list-style:none; margin:0; padding:0; gap:2px; }
        .nav-menu li { position:relative; }
        .nav-link { display:flex; align-items:center; gap:5px; padding:8px 14px; color:#475569; text-decoration:none; font-size:0.9rem; font-weight:500; border-radius:8px; transition:all .2s; white-space:nowrap; }
        .nav-link:hover { background:#f1f5f9; color:#1a73e8; }
        .nav-link.active { color:#1a73e8; font-weight:600; }
        .nav-link.nav-btn { background:#1a73e8; color:#fff; font-weight:600; border-radius:8px; padding:8px 18px; }
        .nav-link.nav-btn:hover { background:#1557b0; color:#fff; }
        .nav-dropdown-toggle { display:flex; align-items:center; gap:5px; padding:8px 14px; color:#475569; background:none; border:none; font-size:0.9rem; font-weight:500; cursor:pointer; border-radius:8px; transition:all .2s; font-family:inherit; }
        .nav-dropdown-toggle:hover { background:#f1f5f9; color:#1a73e8; }
        .nav-dropdown-toggle i.fa-chevron-down { font-size:0.65rem; transition:transform .2s; }
        .nav-dropdown-menu { display:none; position:absolute; top:100%; left:0; min-width:200px; background:#fff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.12); border:1px solid #e5e7eb; padding:6px; list-style:none; z-index:100; }
        .nav-dropdown-menu.active { display:block; }
        .nav-dropdown-menu .nav-link { padding:10px 14px; font-size:0.9rem; border-radius:8px; }
        .nav-dropdown-menu .nav-link i { width:18px; text-align:center; }
        .nav-dropdown-menu .nav-link:hover { background:#EFF6FF; color:#006EE3; }
        .nav-dropdown-divider { border:none; border-top:1px solid #f1f5f9; margin:4px 0; }
        .nav-user { display:flex; align-items:center; gap:4px; }
        .nav-user.hidden { display:none; }
        .btn-logout { display:flex; align-items:center; gap:5px; padding:8px 14px; color:#dc3545; background:none; border:none; font-size:0.9rem; cursor:pointer; border-radius:8px; transition:all .2s; font-family:inherit; }
        .btn-logout:hover { background:#fef2f2; }
        .nav-mobile-cta { display:none; }
        @media (max-width:900px) {
            .nav-toggle { display:block; }
            .nav-menu { display:none; position:absolute; top:60px; left:0; right:0; background:#fff; flex-direction:column; padding:12px 16px 16px; box-shadow:0 8px 24px rgba(0,0,0,0.1); border-top:1px solid #e5e7eb; gap:2px; }
            .nav-menu.active { display:flex; }
            .nav-link { padding:12px 16px; font-size:1rem; width:100%; }
            .nav-link.nav-btn { text-align:center; justify-content:center; margin-top:8px; }
            .nav-dropdown-menu { position:static; box-shadow:none; border:none; padding-left:16px; }
            .nav-dropdown-menu.active { display:block; }
            .nav-mobile-cta { display:block; margin-top:8px; }
            .nav-mobile-cta a { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:10px; font-size:1rem; font-weight:600; text-decoration:none; }
            .nav-mobile-cta-marketplace { background:linear-gradient(135deg,#006EE3,#3B9AFF); color:#fff; }
            .nav-mobile-cta-marketplace:hover { opacity:0.9; }
        }

        /* === PRODUCT FICHA (large size) === */
        .pd-wrap { max-width:900px; margin:0 auto; padding:24px 21px 72px; }
        .pd-breadcrumb { display:flex; align-items:center; gap:9px; font-size:1rem; color:#94a3b8; margin-bottom:21px; flex-wrap:wrap; }
        .pd-breadcrumb a { color:#006EE3; text-decoration:none; font-weight:500; }
        .pd-breadcrumb a:hover { text-decoration:underline; }
        .pd-breadcrumb .sep { color:#cbd5e1; font-size:0.9rem; }

        /* Main card */
        .pd-card { background:#fff; border-radius:20px; border:1px solid #e5e7eb; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.06); }

        /* Image */
        .pd-img { position:relative; width:100%; height:320px; background:#EFF6FF; overflow:hidden; }
        .pd-img img { width:100%; height:100%; object-fit:cover; display:block; }
        .pd-img-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#006EE3; font-size:3rem; opacity:0.25; }

        /* Category badge */
        .pd-cat-badge { position:absolute; top:15px; left:15px; padding:6px 15px; border-radius:18px; font-size:1rem; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; color:#fff; z-index:2; }
        .badge-general { background:rgba(99,102,241,.85); }
        .badge-vehiculos { background:rgba(239,68,68,.85); }
        .badge-inmuebles { background:rgba(245,158,11,.85); }
        .badge-electronica { background:rgba(14,165,233,.85); }
        .badge-servicios { background:rgba(168,85,247,.85); }
        .badge-ropa { background:rgba(236,72,153,.85); }
        .badge-hogar { background:rgba(0,110,227,.85); }

        /* Card body */
        .pd-body { padding:20px 24px 24px; }
        .pd-biz-name { display:flex; align-items:center; gap:6px; font-size:1.1rem; color:#64748b; margin-bottom:6px; text-decoration:none; }
        .pd-biz-name:hover { color:#1a73e8; }
        .pd-biz-name i { color:#006EE3; font-size:1rem; }
        .pd-title { font-size:1.65rem; font-weight:700; color:#0f172a; margin:0 0 6px; line-height:1.3; letter-spacing:-0.2px; }
        .pd-price { font-size:1.7rem; font-weight:800; color:#006EE3; margin:0 0 12px; }
        .pd-desc { font-size:1.2rem; color:#475569; line-height:1.6; margin:0 0 18px; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
        .pd-meta { display:flex; flex-wrap:wrap; gap:9px; margin-bottom:21px; }
        .pd-meta-chip { display:flex; align-items:center; gap:6px; padding:7px 14px; background:#f8fafc; border-radius:10px; font-size:1rem; color:#475569; border:1px solid #f1f5f9; }
        .pd-meta-chip i { color:#006EE3; font-size:1rem; }
        .pd-actions { display:flex; gap:12px; flex-wrap:wrap; }
        .pd-btn { display:inline-flex; align-items:center; gap:9px; padding:14px 28px; border-radius:15px; font-size:1.2rem; font-weight:600; text-decoration:none; cursor:pointer; transition:all .25s; font-family:inherit; border:none; }
        .pd-btn-wa { background:linear-gradient(135deg,#25d366,#128c7e); color:#fff; box-shadow:0 3px 12px rgba(37,211,102,.3); }
        .pd-btn-wa:hover { box-shadow:0 6px 21px rgba(37,211,102,.45); transform:translateY(-2px); color:#fff; }
        .pd-btn-out { background:#fff; color:#475569; border:2px solid #e2e8f0; }
        .pd-btn-out:hover { border-color:#006EE3; color:#006EE3; background:#EFF6FF; }

        /* Business section */
        .pd-divider { border:none; border-top:1px solid #f1f5f9; margin:0; }
        .pd-biz-section { padding:16px 24px; }
        .pd-biz-section-label { font-size:1rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#94a3b8; margin-bottom:12px; }
        .pd-biz-card { display:flex; align-items:center; gap:18px; padding:15px 18px; background:linear-gradient(135deg,#EFF6FF,#EFF6FF); border:2px solid #d1fae5; border-radius:18px; text-decoration:none; transition:all .25s; }
        .pd-biz-card:hover { border-color:#006EE3; box-shadow:0 5px 18px rgba(0,110,227,.1); }
        .pd-biz-icon { width:50px; height:50px; border-radius:13px; background:linear-gradient(135deg,#006EE3,#3B9AFF); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem; flex-shrink:0; }
        .pd-biz-info { flex:1; min-width:0; }
        .pd-biz-name-card { font-size:1.25rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pd-biz-loc { font-size:1rem; color:#64748b; }
        .pd-biz-arrow { color:#006EE3; font-size:1.05rem; flex-shrink:0; }

        /* === RELATED PRODUCTS (3-col compact grid) === */
        .pd-section-related { margin-top:27px; }
        .pd-section-title { font-size:1.3rem; font-weight:700; color:#0f172a; margin-bottom:15px; display:flex; align-items:center; gap:9px; }
        .pd-section-title i { color:#006EE3; font-size:1.17rem; }
        .rp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .rp-card { background:#fff; border-radius:15px; border:1px solid #e5e7eb; overflow:hidden; text-decoration:none; color:inherit; transition:all .25s; }
        .rp-card:hover { border-color:#006EE3; box-shadow:0 5px 15px rgba(0,110,227,.1); transform:translateY(-3px); }
        .rp-card-img { position:relative; width:100%; padding-top:75%; background:#EFF6FF; overflow:hidden; }
        .rp-card-img img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; }
        .rp-card-ph { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#006EE3; font-size:1.65rem; opacity:0.25; }
        .rp-badge { position:absolute; top:8px; left:8px; width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:#fff; }
        .rp-card-body { padding:12px 14px 14px; }
        .rp-card-name { font-size:1rem; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
        .rp-card-price { font-size:1.1rem; font-weight:700; color:#006EE3; }

        .pd-video { max-width:320px; margin:0 auto; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
        .pd-video iframe { width:100%; aspect-ratio:9/16; display:block; }

        @media (max-width:640px) {
            .pd-wrap { padding:15px 12px 54px; }
            .pd-body { padding:18px 18px 21px; }
            .pd-biz-section { padding:15px 18px; }
            .pd-title { font-size:1.5rem; }
            .pd-price { font-size:1.55rem; }
            .pd-img { height:270px; }
            .rp-grid { grid-template-columns:repeat(3,1fr); gap:11px; }
            .rp-card-body { padding:10px 12px 12px; }
            .rp-card-name { font-size:0.9rem; }
            .rp-card-price { font-size:1rem; }
            .pd-actions { flex-direction:column; }
            .pd-btn { justify-content:center; }
            .pd-breadcrumb { font-size:0.9rem; }
            .pd-biz-name { font-size:1rem; }
            .pd-desc { font-size:1.1rem; }
            .pd-meta-chip { font-size:0.9rem; padding:6px 12px; }
            .pd-section-title { font-size:1.15rem; }
            .pd-biz-name-card { font-size:1.15rem; }
            .pd-biz-loc { font-size:0.9rem; }
            .pd-cat-badge { font-size:0.9rem; padding:5px 12px; }
        }
    </style>
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo"><img src="https://aunclick.pages.dev/images/logoprincipal.jpeg" alt="HOLAX" style="height:32px;width:auto;border-radius:6px;margin-right:4px;"> <span class="brand-name">HOLAX</span></a>
            <button class="nav-toggle" id="navToggle" aria-label="Abrir menú">
                <i class="fas fa-bars"></i>
            </button>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link active">Inicio</a></li>
                <li><a href="/marketplace.html" class="nav-link">Marketplace</a></li>
                <li><a href="/empleo.html" class="nav-link">Empleo</a></li>
                <li><a href="/entretenimiento.html" class="nav-link">Entretenimiento</a></li>
                <li><a href="/cupones.html" class="nav-link">Cupones</a></li>
                <li class="nav-dropdown">
                    <button class="nav-dropdown-toggle" aria-label="Más opciones">
                        Más <i class="fas fa-chevron-down"></i>
                    </button>
                    <ul class="nav-dropdown-menu" id="navbarDropdown">
                        <li><a href="/marketplace.html" class="nav-link"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
                        <li class="nav-dropdown-divider"></li>
                        <li><a href="/emergencia.html" class="nav-link" style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Emergencias</a></li>
                    </ul>
                </li>
                <li id="navLoginItem"><a href="/login.html" class="nav-link nav-btn">Login</a></li>
                <li id="navUserItem" class="nav-user hidden">
                    <a href="/dashboard.html" class="nav-link" id="navUserName">
                        <i class="fas fa-user-circle"></i> Mi Cuenta
                    </a>
                    <button class="nav-link btn-logout" id="navLogout">
                        <i class="fas fa-sign-out-alt"></i> Salir
                    </button>
                </li>
                <li class="nav-mobile-cta">
                    <a href="/marketplace.html" class="nav-mobile-cta-marketplace">
                        <i class="fas fa-shopping-bag"></i> Marketplace
                    </a>
                </li>
            </ul>
        </div>
    </nav>

    <div class="pd-wrap">
        <div class="pd-breadcrumb">
            <a href="/"><i class="fas fa-home"></i></a>
            <span class="sep"><i class="fas fa-chevron-right"></i></span>
            <a href="/marketplace.html"><i class="fas fa-shopping-bag"></i> Marketplace</a>
            <span class="sep"><i class="fas fa-chevron-right"></i></span>
            <span>${esc(title)}</span>
        </div>

        <div class="pd-card">
            <div class="pd-img">
                ${product.image
                    ? `<img src="${esc(product.image)}" alt="${esc(title)}" onerror="this.parentElement.innerHTML='<div class=\\'pd-img-ph\\'><i class=\\'fas fa-image\\'></i></div>'">`
                    : `<div class="pd-img-ph"><i class="fas fa-image"></i></div>`}
                <span class="pd-cat-badge ${catBadge}"><i class="fas ${catIcon}"></i> ${catLabel}</span>
            </div>

            ${product.video_url ? `
            <div class="pd-video">
              ${getVideoEmbed(product.video_url)}
            </div>` : ''}

            <div class="pd-body">
                ${bizLink ? `<a href="${bizLink}" class="pd-biz-name"><i class="fas fa-store"></i> ${esc(product.business_name || 'Negocio')}${product.city ? ' · ' + esc(product.city) : ''}</a>` : (product.business_name ? `<div class="pd-biz-name"><i class="fas fa-store"></i> ${esc(product.business_name)}</div>` : '')}
                <h1 class="pd-title">${esc(title)}</h1>
                ${price ? `<div class="pd-price">${price}</div>` : ''}
                <p class="pd-desc">${esc(product.description || 'Sin descripcion disponible.')}</p>
                <div class="pd-meta">
                    <div class="pd-meta-chip"><i class="fas fa-tag"></i> ${catLabel}</div>
                    ${(product.created_at && fmtDate(product.created_at) && !fmtDate(product.created_at).includes('NaN')) ? `<div class="pd-meta-chip"><i class="far fa-clock"></i> ${fmtDate(product.created_at)}</div>` : ''}
                    ${waNumber ? `<div class="pd-meta-chip"><i class="fab fa-whatsapp"></i> WhatsApp</div>` : ''}
                </div>
                <div class="pd-actions">
                    ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="pd-btn pd-btn-wa"><i class="fab fa-whatsapp"></i> Contactar</a>` : ''}
                    <button class="pd-btn pd-btn-out" onclick="shareProduct()"><i class="fas fa-share-alt"></i> Compartir</button>
                </div>
            </div>

            ${product.business_name ? `
            <hr class="pd-divider">
            <div class="pd-biz-section">
                <div class="pd-biz-section-label"><i class="fas fa-store"></i> Negocio Asociado</div>
                ${bizLink ? `
                <a href="${bizLink}" class="pd-biz-card">
                    <div class="pd-biz-icon"><i class="fas fa-store"></i></div>
                    <div class="pd-biz-info">
                        <div class="pd-biz-name-card">${esc(product.business_name)}</div>
                        ${product.city ? `<div class="pd-biz-loc"><i class="fas fa-map-marker-alt" style="font-size:0.6rem;"></i> ${esc(product.city)}${product.state ? ', ' + esc(product.state) : ''}</div>` : ''}
                    </div>
                    <div class="pd-biz-arrow"><i class="fas fa-chevron-right"></i></div>
                </a>` : `
                <div class="pd-biz-card" style="cursor:default;">
                    <div class="pd-biz-icon"><i class="fas fa-store"></i></div>
                    <div class="pd-biz-info">
                        <div class="pd-biz-name-card">${esc(product.business_name)}</div>
                        ${product.city ? `<div class="pd-biz-loc"><i class="fas fa-map-marker-alt" style="font-size:0.6rem;"></i> ${esc(product.city)}${product.state ? ', ' + esc(product.state) : ''}</div>` : ''}
                    </div>
                </div>`}
            </div>` : ''}

            ${(() => { const instagram = product.business_instagram; const facebook = product.business_facebook; const twitter = product.business_twitter; const tiktok = product.business_tiktok; const youtube = product.business_youtube; const hasSocial = instagram || facebook || twitter || tiktok || youtube; const hasWeb = product.business_slug; if (!hasSocial && !hasWeb) return ''; return `
            <hr class="pd-divider">
            <div class="pd-biz-section">
                <div class="pd-biz-section-label" style="font-size:1rem;font-weight:700;color:#0f172a;text-transform:none;letter-spacing:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-share-nodes" style="color:#006EE3;"></i> Redes Sociales y Web
                </div>
                <div style="display:flex;gap:15px;flex-wrap:wrap;margin-top:12px;">
                    ${hasWeb ? `<a href="/web/${esc(product.business_slug)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:linear-gradient(135deg,#006EE3,#0ea5e9);color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fas fa-globe" style="font-size:1.5rem;"></i> Sitio Web</a>` : ''}
                    ${instagram ? `<a href="${esc(instagram)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-instagram" style="font-size:1.5rem;"></i> Instagram</a>` : ''}
                    ${facebook ? `<a href="${esc(facebook)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#1877f2;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-facebook-f" style="font-size:1.5rem;"></i> Facebook</a>` : ''}
                    ${twitter ? `<a href="${esc(twitter)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-x-twitter" style="font-size:1.5rem;"></i> X (Twitter)</a>` : ''}
                    ${tiktok ? `<a href="${esc(tiktok)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#010101;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-tiktok" style="font-size:1.5rem;"></i> TikTok</a>` : ''}
                    ${youtube ? `<a href="${esc(youtube)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:18px;background:#ff0000;color:#fff;text-decoration:none;font-size:1.35rem;font-weight:700;"><i class="fab fa-youtube" style="font-size:1.5rem;"></i> YouTube</a>` : ''}
                </div>
            </div>`; })()}
        </div>

        ${relatedHtml}
    </div>

    <script>
    function shareProduct(){
        if(navigator.share){navigator.share({title:'${escJs(title)}',text:'${escJs(product.description||title)}',url:location.href}).catch(function(){});}
        else{window.open('https://wa.me/?text='+encodeURIComponent('${escJs(title)} - En HOLAX Marketplace')+'%20'+encodeURIComponent(location.href),'_blank');}
    }
    // Navbar dropdown toggle
    document.querySelectorAll('.nav-dropdown-toggle').forEach(function(btn){
        btn.addEventListener('click',function(e){
            e.stopPropagation();
            var menu=this.nextElementSibling;
            if(menu) menu.classList.toggle('active');
            this.classList.toggle('active');
        });
    });
    document.addEventListener('click',function(){document.querySelectorAll('.nav-dropdown-menu.active').forEach(function(m){m.classList.remove('active');});document.querySelectorAll('.nav-dropdown-toggle.active').forEach(function(t){t.classList.remove('active');});});
    // Mobile nav toggle
    var navToggle=document.getElementById('navToggle');
    var navMenu=document.getElementById('navMenu');
    if(navToggle&&navMenu){navToggle.addEventListener('click',function(){navMenu.classList.toggle('active');});}
    </script>
    <script src="/js/app.js"></script>
    <script>setTimeout(function(){fetch('/api/business-stats/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:${product.business_id},event_type:'view',source:'product'})}).catch(function(){})},0);</script>
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

function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : ''; }
function escJs(s) { return s ? s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n') : ''; }

function getCatBadge(c) {
  return {general:'badge-general',vehiculos:'badge-vehiculos',inmuebles:'badge-inmuebles',electronica:'badge-electronica',servicios:'badge-servicios',ropa:'badge-ropa',hogar:'badge-hogar'}[c]||'badge-general';
}
function getCatLabel(c) {
  return {general:'General',vehiculos:'Vehiculos',inmuebles:'Inmuebles',electronica:'Electronica',servicios:'Servicios',ropa:'Ropa',hogar:'Hogar'}[c]||c||'General';
}
function getCatIcon(c) {
  return {general:'fa-tag',vehiculos:'fa-car',inmuebles:'fa-building',electronica:'fa-laptop',servicios:'fa-wrench',ropa:'fa-tshirt',hogar:'fa-couch'}[c]||'fa-tag';
}
function fmtDate(d) {
  if(!d) return '';
  try { const dt=new Date(d+'T00:00:00'); return dt.getDate()+' '+['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][dt.getMonth()]+' '+dt.getFullYear(); } catch(e) { return d; }
}

function getVideoEmbed(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // YouTube Shorts: youtube.com/shorts/XXX
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (ytShortsMatch) return `<iframe src="https://www.youtube.com/embed/${ytShortsMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `<iframe src="https://www.tiktok.com/embed/v2/${ttMatch[1]}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
  // Direct video files (R2 uploads): .mp4, .webm, .ogg, .mov
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return `<video src="${esc(url)}" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;"></video>`;
  }
  return `<iframe src="${esc(url)}" width="100%" style="aspect-ratio:9/16;" frameborder="0" allowfullscreen></iframe>`;
}
