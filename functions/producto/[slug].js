// functions/producto/[slug].js
// GET: Serve SEO-optimized product detail page at /producto/:slug
// Compact product ficha + business info + 3 related products

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
              b.phone as business_phone, b.whatsapp as business_whatsapp
       FROM products p
       LEFT JOIN businesses b ON p.business_id = b.id
       WHERE p.slug = ? AND (p.status = 'approved' OR p.status IS NULL)`
    ).bind(slug).first();

    if (!product) {
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        const byId = await env.DB.prepare(
          `SELECT p.*, b.title as business_name, b.slug as business_slug,
                  b.city, b.state, b.whatsapp as business_whatsapp
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

    const baseUrl = 'https://aunclick.pages.dev';
    const title = product.name || 'Producto';
    const price = product.price ? `$${Number(product.price).toLocaleString('es-VE')}` : '';
    const description = product.description
      ? product.description.substring(0, 160)
      : `${title}${price ? ' - ' + price : ''} - Disponible en Un Click Marketplace, Venezuela.`;
    const imageUrl = product.image || `${baseUrl}/logo.png`;
    const canonicalUrl = `${baseUrl}/producto/${product.slug}`;

    // Fetch 3 related products (same category, different product, approved)
    let relatedProducts = [];
    try {
      const related = await env.DB.prepare(
        `SELECT p.id, p.name, p.price, p.image, p.slug, p.category
         FROM products p
         WHERE p.category = ? AND p.id != ? AND (p.status = 'approved' OR p.status IS NULL)
         ORDER BY p.created_at DESC LIMIT 3`
      ).bind(product.category || 'general', product.id).all();
      relatedProducts = related.results || [];
    } catch(e) {}

    const catBadge = getCatBadge(product.category);
    const catLabel = getCatLabel(product.category);
    const catIcon = getCatIcon(product.category);
    const waNumber = product.business_whatsapp ? product.business_whatsapp.replace(/[^0-9]/g, '') : '';
    const waMsg = encodeURIComponent('Hola, estoy interesado en: ' + product.name);
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : '';
    const bizLink = product.business_slug ? `/negocio/${product.business_slug}` : '';

    // Build related products HTML
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
    <title>${esc(title)}${price ? ' - ' + price : ''} - Un Click Marketplace</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="product">
    <meta property="og:title" content="${esc(title)}${price ? ' - ' + price : ''}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="Un Click Marketplace">
    <meta property="og:locale" content="es_VE">
    <meta property="product:price:amount" content="${product.price || '0'}">
    <meta property="product:price:currency" content="USD">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)} - Un Click">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="manifest" href="/manifest.json">
    <style>
        .pd-wrap { max-width:800px; margin:0 auto; padding:16px 12px 48px; }
        .pd-breadcrumb { display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#94a3b8; margin-bottom:14px; flex-wrap:wrap; }
        .pd-breadcrumb a { color:#059669; text-decoration:none; font-weight:500; }
        .pd-breadcrumb a:hover { text-decoration:underline; }
        .pd-breadcrumb .sep { color:#cbd5e1; font-size:0.6rem; }
        .pd-card { background:#fff; border-radius:16px; border:1.5px solid #e5e7eb; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.04); }
        .pd-img { position:relative; width:100%; background:#f0fdf4; overflow:hidden; }
        .pd-img img { width:100%; max-height:260px; object-fit:contain; display:block; }
        .pd-img-ph { width:100%; height:180px; display:flex; align-items:center; justify-content:center; color:#059669; font-size:2rem; opacity:0.3; }
        .pd-cat-badge { position:absolute; top:10px; left:10px; padding:4px 10px; border-radius:16px; font-size:0.68rem; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; color:#fff; z-index:2; }
        .badge-general { background:rgba(99,102,241,.85); }
        .badge-vehiculos { background:rgba(239,68,68,.85); }
        .badge-inmuebles { background:rgba(245,158,11,.85); }
        .badge-electronica { background:rgba(14,165,233,.85); }
        .badge-servicios { background:rgba(168,85,247,.85); }
        .badge-ropa { background:rgba(236,72,153,.85); }
        .badge-hogar { background:rgba(5,150,105,.85); }
        .pd-body { padding:18px 18px 14px; }
        .pd-title { font-size:1.15rem; font-weight:700; color:#0f172a; margin:0 0 4px; line-height:1.3; letter-spacing:-0.2px; }
        .pd-biz-name { display:flex; align-items:center; gap:4px; font-size:0.76rem; color:#64748b; margin-bottom:6px; text-decoration:none; }
        .pd-biz-name:hover { color:#1a73e8; }
        .pd-biz-name i { color:#059669; font-size:0.66rem; }
        .pd-price { font-size:1.2rem; font-weight:800; color:#059669; margin:0 0 10px; }
        .pd-desc { font-size:0.85rem; color:#475569; line-height:1.65; margin:0 0 14px; }
        .pd-meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
        .pd-meta-chip { display:flex; align-items:center; gap:5px; padding:6px 10px; background:#f8fafc; border-radius:8px; font-size:0.74rem; color:#475569; border:1px solid #f1f5f9; }
        .pd-meta-chip i { color:#059669; font-size:0.7rem; }
        .pd-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .pd-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 20px; border-radius:10px; font-size:0.82rem; font-weight:600; text-decoration:none; cursor:pointer; transition:all .25s; font-family:inherit; border:none; }
        .pd-btn-wa { background:linear-gradient(135deg,#25d366,#128c7e); color:#fff; box-shadow:0 3px 10px rgba(37,211,102,.3); }
        .pd-btn-wa:hover { box-shadow:0 4px 16px rgba(37,211,102,.45); transform:translateY(-1px); color:#fff; }
        .pd-btn-out { background:#fff; color:#475569; border:1.5px solid #e2e8f0; }
        .pd-btn-out:hover { border-color:#059669; color:#059669; background:#f0fdf4; }
        .pd-divider { border:none; border-top:1px solid #e5e7eb; margin:0; }
        .pd-biz-section { padding:14px 18px; }
        .pd-biz-card { display:flex; align-items:center; gap:12px; padding:12px 14px; background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border:1.5px solid #d1fae5; border-radius:12px; text-decoration:none; transition:all .25s; }
        .pd-biz-card:hover { border-color:#059669; box-shadow:0 4px 14px rgba(5,150,105,.1); }
        .pd-biz-icon { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#059669,#10b981); display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.95rem; flex-shrink:0; }
        .pd-biz-info { flex:1; min-width:0; }
        .pd-biz-label { font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#6ee7b7; margin-bottom:2px; }
        .pd-biz-name-card { font-size:0.9rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pd-biz-loc { font-size:0.72rem; color:#64748b; }
        .pd-biz-arrow { color:#059669; font-size:0.75rem; flex-shrink:0; }

        /* Related Products */
        .pd-section-related { margin-top:20px; }
        .pd-section-title { font-size:0.9rem; font-weight:700; color:#0f172a; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
        .pd-section-title i { color:#059669; font-size:0.82rem; }
        .rp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .rp-card { background:#fff; border-radius:12px; border:1.5px solid #e5e7eb; overflow:hidden; text-decoration:none; color:inherit; transition:all .25s; }
        .rp-card:hover { border-color:#059669; box-shadow:0 4px 12px rgba(5,150,105,.1); transform:translateY(-2px); }
        .rp-card-img { position:relative; width:100%; padding-top:75%; background:#f0fdf4; overflow:hidden; }
        .rp-card-img img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; }
        .rp-card-ph { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#059669; font-size:1.2rem; opacity:0.3; }
        .rp-badge { position:absolute; top:6px; left:6px; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:0.55rem; color:#fff; }
        .rp-card-body { padding:8px 10px 10px; }
        .rp-card-name { font-size:0.75rem; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .rp-card-price { font-size:0.82rem; font-weight:700; color:#059669; }

        @media (max-width:640px) {
            .pd-wrap { padding:12px 8px 36px; }
            .pd-body { padding:14px 14px 10px; }
            .pd-biz-section { padding:12px 14px; }
            .pd-title { font-size:1.05rem; }
            .pd-price { font-size:1.05rem; }
            .pd-img img { max-height:200px; }
            .rp-grid { grid-template-columns:repeat(3,1fr); gap:6px; }
            .rp-card-body { padding:6px 8px 8px; }
            .rp-card-name { font-size:0.68rem; }
            .rp-card-price { font-size:0.75rem; }
            .pd-actions { flex-direction:column; }
            .pd-btn { justify-content:center; }
        }
    </style>
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo"><i class="fas fa-store"></i> <span class="brand-name">Un Click</span></a>
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

            <div class="pd-body">
                ${bizLink ? `<a href="${bizLink}" class="pd-biz-name"><i class="fas fa-store"></i> ${esc(product.business_name || 'Negocio')}${product.city ? ' · ' + esc(product.city) : ''}</a>` : (product.business_name ? `<div class="pd-biz-name"><i class="fas fa-store"></i> ${esc(product.business_name)}</div>` : '')}
                <h1 class="pd-title">${esc(title)}</h1>
                ${price ? `<div class="pd-price">${price}</div>` : ''}
                <p class="pd-desc">${esc(product.description || 'Sin descripcion disponible.')}</p>
                <div class="pd-meta">
                    <div class="pd-meta-chip"><i class="fas fa-tag"></i> ${catLabel}</div>
                    ${product.created_at ? `<div class="pd-meta-chip"><i class="far fa-clock"></i> ${fmtDate(product.created_at)}</div>` : ''}
                    ${waNumber ? `<div class="pd-meta-chip"><i class="fab fa-whatsapp"></i> WhatsApp</div>` : ''}
                </div>
                <div class="pd-actions">
                    ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="pd-btn pd-btn-wa"><i class="fab fa-whatsapp"></i> Contactar</a>` : ''}
                    <button class="pd-btn pd-btn-out" onclick="shareProduct()"><i class="fas fa-share-alt"></i> Compartir</button>
                    <a href="/marketplace.html" class="pd-btn pd-btn-out"><i class="fas fa-arrow-left"></i> Marketplace</a>
                </div>
            </div>

            ${product.business_name ? `
            <hr class="pd-divider">
            <div class="pd-biz-section">
                <div class="pd-biz-label"><i class="fas fa-store"></i> Negocio Asociado</div>
                ${bizLink ? `
                <a href="${bizLink}" class="pd-biz-card">
                    <div class="pd-biz-icon"><i class="fas fa-store"></i></div>
                    <div class="pd-biz-info">
                        <div class="pd-biz-name-card">${esc(product.business_name)}</div>
                        ${product.city ? `<div class="pd-biz-loc"><i class="fas fa-map-marker-alt" style="font-size:0.65rem;"></i> ${esc(product.city)}${product.state ? ', ' + esc(product.state) : ''}</div>` : ''}
                    </div>
                    <div class="pd-biz-arrow"><i class="fas fa-chevron-right"></i></div>
                </a>` : `
                <div class="pd-biz-card" style="cursor:default;">
                    <div class="pd-biz-icon"><i class="fas fa-store"></i></div>
                    <div class="pd-biz-info">
                        <div class="pd-biz-name-card">${esc(product.business_name)}</div>
                        ${product.city ? `<div class="pd-biz-loc"><i class="fas fa-map-marker-alt" style="font-size:0.65rem;"></i> ${esc(product.city)}${product.state ? ', ' + esc(product.state) : ''}</div>` : ''}
                    </div>
                </div>`}
            </div>` : ''}
        </div>

        ${relatedHtml}
    </div>

    <script>
    function shareProduct(){
        if(navigator.share){navigator.share({title:'${escJs(title)}',text:'${escJs(product.description||title)}',url:location.href}).catch(function(){});}
        else{window.open('https://wa.me/?text='+encodeURIComponent('${escJs(title)} - En Un Click Marketplace')+'%20'+encodeURIComponent(location.href),'_blank');}
    }
    </script>
    <script src="/js/app.js"></script>
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
