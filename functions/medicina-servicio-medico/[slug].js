// functions/medicina-servicio-medico/[slug].js
// GET: Serve business detail page at /medicina-servicio-medico/:slug
// Category-specific URL for Medicina / Servicio Médico businesses (SEO)

import { renderBusinessPage } from '../_lib/render-business.js';

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up business by slug — only medicina category
    const business = await env.DB.prepare(
      `SELECT 
        b.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
        (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.slug = ? AND b.status = 'approved' AND c.slug = 'medicina-servicio-medico'`
    ).bind(slug).first();

    if (!business) {
      // Maybe it exists but is NOT medicina — redirect to /negocio/
      const anyBiz = await env.DB.prepare(
        `SELECT slug FROM businesses WHERE slug = ? AND status = 'approved'`
      ).bind(slug).first();
      if (anyBiz) {
        return new Response('', {
          status: 301,
          headers: { 'Location': `/negocio/${anyBiz.slug}` },
        });
      }

      return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return renderBusinessPage(env, business, {
      pathPrefix: '/medicina-servicio-medico',
      sectionLabel: 'Medicina / Servicio Médico',
      categoryBreadcrumb: {
        name: 'Medicina / Servicio Médico',
        url: 'https://aunclick.pages.dev/categoria/medicina-servicio-medico',
      },
    });

  } catch (error) {
    console.error('Medicina business GET error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}