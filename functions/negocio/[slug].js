// functions/negocio/[slug].js
// GET: Serve SEO-optimized business detail page at /negocio/:slug
// Looks up business by slug, returns pre-rendered HTML with H1, meta tags, OG tags

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
        if (byId) {
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

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - Un Click | Directorio de Negocios en Venezuela</title>
    <meta name="description" content="${escapeHtml(description)}">
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
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>U</text></svg>">
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">
                <i class="fas fa-store"></i>
                <span class="brand-name">Un Click</span>
            </a>
        </div>
    </nav>

    <div style="max-width:800px;margin:20px auto;padding:0 16px;">
        <h1 style="font-size:1.6rem;margin-bottom:8px;">${escapeHtml(title)}</h1>
        <p style="color:#666;margin:0;">${escapeHtml(description)}</p>
        <div style="margin-top:20px;padding:16px;background:#f8f9fa;border-radius:12px;">
            <div style="display:flex;flex-wrap:wrap;gap:16px;color:#555;font-size:0.9rem;">
                ${business.category_name ? `<span><i class="fas fa-tag" style="color:#1a73e8;"></i> ${escapeHtml(business.category_name)}</span>` : ''}
                ${business.city ? `<span><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i> ${escapeHtml(business.city)}, ${escapeHtml(business.state || '')}</span>` : ''}
                ${business.phone ? `<span><i class="fas fa-phone" style="color:#059669;"></i> ${escapeHtml(business.phone)}</span>` : ''}
            </div>
        </div>
        <div style="margin-top:24px;text-align:center;">
            <a href="/business.html?id=${business.id}" class="btn btn-primary" style="display:inline-block;padding:12px 32px;font-size:1rem;border-radius:10px;background:linear-gradient(135deg,#1a73e8,#4285f4);color:#fff;text-decoration:none;font-weight:600;">
                <i class="fas fa-eye"></i> Ver Ficha Completa
            </a>
        </div>
    </div>

    <script>
      // Load full business detail page
      window.location.href = '/business.html?id=${business.id}';
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

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
