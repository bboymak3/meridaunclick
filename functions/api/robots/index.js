// functions/api/robots/index.js
// GET: Return robots.txt (no auth required)

export async function onRequestGet() {
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://aunclick.pages.dev/api/sitemap`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}