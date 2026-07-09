// functions/api/robots/index.js
// GET: Return robots.txt (no auth required)
// Fallback: static robots.txt at root should also exist via _redirects

export async function onRequestGet() {
  const robotsTxt = `# OLAX - Directorio Nacional de Negocios de Venezuela
# https://aunclick.pages.dev

User-agent: *
Allow: /

# Bloquear páginas privadas y de administración
Disallow: /admin.html
Disallow: /dashboard.html
Disallow: /api/
Disallow: /functions/

# Bloquear parámetros de búsqueda (evitar contenido duplicado)
Disallow: /*?q=
Disallow: /*?state=
Disallow: /*?category=
Disallow: /*?page=
Disallow: /*?sort=

# Sitemap
Sitemap: https://aunclick.pages.dev/api/sitemap`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
