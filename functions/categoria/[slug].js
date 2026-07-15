// functions/categoria/[slug].js
// GET: SEO-indexable category page at /categoria/:slug
// Lists all approved businesses in a category with H1, description, JSON-LD

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    const baseUrl = 'https://holax.com.ve';

    // Look up category by slug
    const category = await env.DB.prepare(
      `SELECT * FROM categories WHERE slug = ?`
    ).bind(slug).first();

    if (!category) {
      // Try matching by name (slugify comparison)
      const allCats = await env.DB.prepare(
        `SELECT * FROM categories ORDER BY name ASC`
      ).all();
      const match = (allCats.results || []).find(c => {
        const catSlug = c.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return catSlug === decodeURIComponent(slug);
      });
      if (!match) {
        return new Response('<h1>Categoría no encontrada</h1><p>La categoría que buscas no existe.</p>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response('', {
        status: 301,
        headers: { 'Location': `/categoria/${match.slug}` },
      });
    }

    // Fetch approved businesses in this category
    const businesses = await env.DB.prepare(
      `SELECT b.id, b.title, b.slug, b.description, b.city, b.state, b.phone, b.whatsapp,
              b.logo, b.business_type,
              c.name as category_name, c.slug as category_slug,
              (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
              b.featured, b.views
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.category_id = ? AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
       ORDER BY b.featured DESC, b.views DESC
       LIMIT 100`
    ).bind(category.id).all();

    const catName = category.name || 'Categoría';
    const catIcon = category.icon || 'fas fa-tag';
    const catDescription = `Directorio de ${catName.toLowerCase()} en Venezuela. Encuentra los mejores negocios de ${catName.toLowerCase()} con información de contacto, ubicación, servicios y más.`;
    const canonicalUrl = `${baseUrl}/categoria/${category.slug}`;
    const totalBiz = businesses.results ? businesses.results.length : 0;

    // Count by state for this category
    const stateCounts = await env.DB.prepare(
      `SELECT b.state, COUNT(*) as count
       FROM businesses b
       WHERE b.category_id = ? AND b.status = 'approved'
       GROUP BY b.state
       ORDER BY count DESC
       LIMIT 15`
    ).bind(category.id).all();

    // Helper to build SEO URL segments for a business
    function bizTipo(b) {
      return (b.business_type || 'negocio').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Build business cards HTML
    const bizCards = (businesses.results || []).map(b => {
      const desc = b.description ? b.description.substring(0, 120) + (b.description.length > 120 ? '...' : '') : '';
      const img = b.cover_image || b.logo || '';
      const waNum = (b.whatsapp || b.phone || '').replace(/[^0-9]/g, '');
      const tipo = bizTipo(b);
      const cat = b.category_slug || 'otro';
      return `
        <a href="${esc('/' + tipo + '/' + cat + '/' + b.slug)}" class="cat-biz-card">
          <div class="cat-biz-img">
            ${img ? `<img src="${esc(img)}" alt="${esc(b.title)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="cat-biz-ph"><i class="fas fa-store"></i></div>`}
            ${b.featured ? '<span class="cat-biz-featured"><i class="fas fa-star"></i></span>' : ''}
          </div>
          <div class="cat-biz-body">
            <div class="cat-biz-title">${esc(b.title)}</div>
            <div class="cat-biz-loc"><i class="fas fa-map-marker-alt"></i> ${esc(b.city || '')}${b.state ? ', ' + esc(b.state) : ''}</div>
            ${desc ? `<div class="cat-biz-desc">${esc(desc)}</div>` : ''}
          </div>
        </a>`;
    }).join('');

    // Build state links
    const stateLinks = (stateCounts.results || []).map(s => {
      if (!s.state) return '';
      const stateSlug = s.state.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<a href="/estado/${stateSlug}" class="cat-state-chip"><i class="fas fa-map-marker-alt"></i> ${esc(s.state)} <span class="cat-state-count">${s.count}</span></a>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">
    <title>${esc(catName)} en Venezuela - Directorio HolaX</title>
    <meta name="description" content="${esc(catDescription)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(catName)} en Venezuela - HolaX">
    <meta property="og:description" content="${esc(catDescription)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="HolaX">
    <meta property="og:locale" content="es_VE">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${esc(catName)} en Venezuela - HolaX">
    <meta name="twitter:description" content="${esc(catDescription)}">

    <!-- JSON-LD: CollectionPage + BreadcrumbList -->
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${catName} en Venezuela`,
      "description": catDescription,
      "url": canonicalUrl,
      "isPartOf": {
        "@type": "WebSite",
        "name": "HolaX",
        "url": "https://holax.com.ve"
      }
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://holax.com.ve/" },
        { "@type": "ListItem", "position": 2, "name": "Negocios", "item": "https://holax.com.ve/search.html" },
        { "@type": "ListItem", "position": 3, "name": catName, "item": canonicalUrl }
      ]
    })}</script>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${catName} en Venezuela`,
      "numberOfItems": totalBiz,
      "itemListElement": (businesses.results || []).slice(0, 20).map((b, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": b.title,
        "url": baseUrl + '/' + bizTipo(b) + '/' + (b.category_slug || 'otro') + '/' + b.slug
      }))
    })}</script>

    <link rel="stylesheet" href="/css/styles.css?v=4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background: #f5f5f5; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .cat-nav { background: #fff; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .cat-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; height: 60px; }
        .cat-nav-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 1.2rem; font-weight: 800; color: #006EE3; }
        .cat-nav-logo:hover { opacity: 0.9; }
        .cat-hero { background: linear-gradient(135deg, #0a0f1a 0%, #1e293b 100%); padding: 60px 20px 50px; text-align: center; color: #fff; }
        .cat-hero-icon { width: 64px; height: 64px; border-radius: 18px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 20px; color: #fbbf24; }
        .cat-hero h1 { font-size: 2.2rem; font-weight: 800; margin: 0 0 12px; }
        .cat-hero p { font-size: 1.05rem; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0 auto 20px; line-height: 1.6; }
        .cat-hero-count { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); padding: 8px 20px; border-radius: 50px; font-size: 0.9rem; font-weight: 600; }
        .cat-breadcrumb { max-width: 1200px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #94a3b8; }
        .cat-breadcrumb a { color: #006EE3; text-decoration: none; }
        .cat-breadcrumb a:hover { text-decoration: underline; }
        .cat-content { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; }
        .cat-section-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
        .cat-section-title i { color: #006EE3; }
        .cat-states { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .cat-state-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; color: #475569; text-decoration: none; transition: all 0.2s; font-weight: 500; }
        .cat-state-chip:hover { border-color: #006EE3; color: #006EE3; background: #f0f7ff; }
        .cat-state-count { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .cat-biz-card { background: #fff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb; text-decoration: none; color: inherit; transition: all 0.2s; display: block; }
        .cat-biz-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); border-color: #006EE3; }
        .cat-biz-img { position: relative; aspect-ratio: 3/4; overflow: hidden; background: #f0f0f0; }
        .cat-biz-img img { width: 100%; height: 100%; object-fit: contain; object-position: center; }
        .cat-biz-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 2.5rem; }
        .cat-biz-featured { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 26px; height: 26px; background: #fbbf24; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .cat-biz-body { padding: 8px 10px 10px; }
        .cat-biz-title { font-size: 0.78rem; font-weight: 700; color: #1e293b; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cat-biz-loc { font-size: 0.65rem; color: #64748b; margin: 0 0 3px; }
        .cat-biz-loc i { font-size: 0.55rem; }
        .cat-biz-desc { font-size: 0.6rem; color: #94a3b8; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cat-empty { text-align: center; padding: 60px 20px; color: #94a3b8; }
        .cat-empty i { font-size: 3rem; margin-bottom: 16px; display: block; }
        .cat-footer { background: #0f172a; color: #94a3b8; text-align: center; padding: 30px 20px; font-size: 0.82rem; }
        .cat-footer a { color: #006EE3; }
        @media (max-width: 1024px) { .cat-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) {
            .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .cat-hero { padding: 40px 16px 36px; }
            .cat-hero h1 { font-size: 1.6rem; }
            .cat-content { padding: 0 12px 40px; }
        }
    </style>
</head>
<body>
    <nav class="cat-nav">
        <div class="cat-nav-inner">
            <a href="/" class="cat-nav-logo">
                <img src="/images/favicon.jpeg" alt="HolaX" style="height:32px;width:auto;border-radius:6px;">
                HolaX
            </a>
        </div>
    </nav>

    <section class="cat-hero">
        <div class="cat-hero-icon"><i class="${esc(catIcon)}"></i></div>
        <h1>${esc(catName)} en Venezuela</h1>
        <p>${esc(catDescription)}</p>
        <div class="cat-hero-count"><i class="fas fa-store"></i> ${totalBiz} negocio${totalBiz !== 1 ? 's' : ''} registrado${totalBiz !== 1 ? 's' : ''}</div>
    </section>

    <div class="cat-breadcrumb">
        <a href="/">Inicio</a> <span>/</span>
        <a href="/search.html">Negocios</a> <span>/</span>
        <span>${esc(catName)}</span>
    </div>

    <div class="cat-content">
        ${stateLinks ? `
        <div class="cat-section-title"><i class="fas fa-map"></i> Filtrar por estado</div>
        <div class="cat-states">${stateLinks}</div>
        ` : ''}

        <div class="cat-section-title"><i class="fas fa-th-large"></i> Todos los negocios</div>
        ${totalBiz > 0 ? `
        <div class="cat-grid">${bizCards}</div>
        ` : `
        <div class="cat-empty">
            <i class="fas fa-store-slash"></i>
            <p>Aún no hay negocios registrados en esta categoría.</p>
            <a href="/new-business.html" style="color:#006EE3;font-weight:600;margin-top:12px;display:inline-block;">Publica tu negocio aquí</a>
        </div>
        `}
    </div>

    <footer class="cat-footer">
        <p>&copy; ${new Date().getFullYear()} <a href="/">HolaX</a> — Directorio de Negocios en Venezuela</p>
    </footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Link': `<${canonicalUrl}>; rel="canonical"`,
      },
    });
  } catch (error) {
    console.error('[categoria] Error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}