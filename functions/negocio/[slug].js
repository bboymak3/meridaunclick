// functions/negocio/[slug].js
// GET: Serve full business detail page at /negocio/:slug
// Medicina businesses get 301 redirect to /medicina-servicio-medico/:slug

import { renderBusinessPage } from '../_lib/render-business.js';

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up business by slug (include category slug for redirect check)
    const business = await env.DB.prepare(
      `SELECT 
        b.*,
        c.name as category_name,
        c.slug as category_slug,
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
          `SELECT b.*, c.name as category_name, c.slug as category_slug,
            (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image
          FROM businesses b
          LEFT JOIN categories c ON b.category_id = c.id
          WHERE b.id = ? AND b.status = 'approved'`
        ).bind(numericSlug).first();
        if (byId) {
          const prefix = byId.category_slug === 'medicina-servicio-medico' ? '/medicina-servicio-medico' : '/negocio';
          return new Response('', {
            status: 301,
            headers: { 'Location': `${prefix}/${byId.slug}` },
          });
        }
      }

      return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 301 redirect medicina businesses to their category-specific URL
    if (business.category_slug === 'medicina-servicio-medico') {
      return new Response('', {
        status: 301,
        headers: { 'Location': `/medicina-servicio-medico/${business.slug}` },
      });
    }

    return renderBusinessPage(env, business, { pathPrefix: '/negocio' });

  } catch (error) {
    console.error('Negocio GET error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}