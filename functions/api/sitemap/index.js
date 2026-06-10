// functions/api/sitemap/index.js
// GET: Generate dynamic XML sitemap for SEO (no auth required)

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const baseUrl = 'https://aunclick.pages.dev';

    // All public-facing pages (ordered by priority)
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/search.html', priority: '0.9', changefreq: 'daily' },
      { loc: '/marketplace.html', priority: '0.8', changefreq: 'daily' },
      { loc: '/map.html', priority: '0.8', changefreq: 'weekly' },
      { loc: '/empleo.html', priority: '0.7', changefreq: 'daily' },
      { loc: '/new-business.html', priority: '0.7', changefreq: 'monthly' },
      { loc: '/entretenimiento.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/reservas.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/cupones.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/emergencia.html', priority: '0.6', changefreq: 'monthly' },
      { loc: '/eventos.html', priority: '0.6', changefreq: 'weekly' },
      { loc: '/privacidad.html', priority: '0.4', changefreq: 'yearly' },
      { loc: '/eliminacion-datos.html', priority: '0.3', changefreq: 'yearly' },
      { loc: '/login.html', priority: '0.3', changefreq: 'monthly' },
    ];

    let dynamicUrls = '';

    // Fetch all approved businesses with slugs
    try {
      const businesses = await env.DB.prepare(
        "SELECT slug, updated_at FROM businesses WHERE status = 'approved' AND slug IS NOT NULL AND slug != '' ORDER BY updated_at DESC"
      ).all();

      for (const biz of businesses.results) {
        const lastmod = biz.updated_at ? biz.updated_at.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/negocio/${biz.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
        // Landing page for each business
        dynamicUrls += `  <url>
    <loc>${baseUrl}/web/${biz.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.7</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }

      // Also add legacy redirect URLs for businesses without slug
      const businessesLegacy = await env.DB.prepare(
        "SELECT id, slug, updated_at FROM businesses WHERE status = 'approved' AND (slug IS NULL OR slug = '') ORDER BY updated_at DESC"
      ).all();

      for (const biz of businessesLegacy.results) {
        const lastmod = biz.updated_at ? biz.updated_at.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/negocio/${biz.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.5</priority>
    <changefreq>monthly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // Table may not exist yet — skip
    }

    // Fetch all approved products with slugs
    try {
      const products = await env.DB.prepare(
        "SELECT slug, updated_at FROM products WHERE (status = 'approved' OR status IS NULL) AND slug IS NOT NULL AND slug != '' ORDER BY updated_at DESC"
      ).all();

      for (const prod of products.results) {
        const lastmod = prod.updated_at ? prod.updated_at.substring(0, 10) : '';
        dynamicUrls += `  <url>
    <loc>${baseUrl}/producto/${prod.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.7</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // Products table may not have slug column yet
    }

    // Build static page URLs
    let staticUrls = '';
    for (const page of staticPages) {
      staticUrls += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticUrls}${dynamicUrls}</urlset>`;

    return new Response(xml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response('Error generating sitemap', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
