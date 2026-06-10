// functions/api/sitemap/index.js
// GET: Generate dynamic XML sitemap for SEO (no auth required)

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const baseUrl = 'https://aunclick.pages.dev';

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/search.html', priority: '0.9', changefreq: 'daily' },
      { loc: '/map.html', priority: '0.8', changefreq: 'weekly' },
      { loc: '/marketplace.html', priority: '0.8', changefreq: 'daily' },
      { loc: '/empleo.html', priority: '0.7', changefreq: 'daily' },
      { loc: '/entretenimiento.html', priority: '0.7', changefreq: 'weekly' },
      { loc: '/emergencia.html', priority: '0.6', changefreq: 'monthly' },
      { loc: '/login.html', priority: '0.3', changefreq: 'monthly' },
      { loc: '/dashboard.html', priority: '0.2', changefreq: 'monthly' },
    ];

    // Fetch all approved businesses
    let businessUrls = '';
    try {
      const businesses = await env.DB.prepare(
        "SELECT id, updated_at FROM businesses WHERE status = 'approved' ORDER BY updated_at DESC"
      ).all();

      for (const biz of businesses.results) {
        const lastmod = biz.updated_at ? biz.updated_at.substring(0, 10) : '';
        businessUrls += `  <url>
    <loc>${baseUrl}/business.html?id=${biz.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
      }
    } catch (e) {
      // Table may not exist yet — skip business URLs
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}${businessUrls}</urlset>`;

    return new Response(xml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
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