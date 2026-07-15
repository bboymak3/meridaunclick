// functions/[tipo]/[categoria]/[slug].js
// Universal business detail route: /:tipo-de-negocio/:categoria/:nombre-negocio
// SEO-friendly URL structure for all businesses

import { renderBusinessPage } from '../_lib/render-business.js';

function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SITE_URL = 'https://aunclick.pages.dev';

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { tipo, categoria, slug } = params;

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    // Look up business by slug
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
      // Fallback: try by numeric ID
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
          const correctTipo = slugify(byId.business_type || 'negocio');
          const correctCat = byId.category_slug || 'otro';
          return new Response('', {
            status: 301,
            headers: { 'Location': `/${correctTipo}/${correctCat}/${byId.slug}` },
          });
        }
      }

      return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Verify URL segments match the business data — redirect if wrong
    const correctTipo = slugify(business.business_type || 'negocio');
    const correctCat = business.category_slug || 'otro';

    if (tipo !== correctTipo || categoria !== correctCat) {
      return new Response('', {
        status: 301,
        headers: { 'Location': `/${correctTipo}/${correctCat}/${business.slug}` },
      });
    }

    // Build the canonical URL and path prefix
    const pathPrefix = `/${tipo}/${categoria}`;
    const canonicalUrl = `${SITE_URL}${pathPrefix}/${business.slug}`;

    // Build breadcrumbs
    const tipoLabel = (business.business_type || 'Negocio').charAt(0).toUpperCase() + (business.business_type || 'negocio').slice(1);

    return renderBusinessPage(env, business, {
      pathPrefix: pathPrefix,
      canonicalUrl: canonicalUrl,
      sectionLabel: business.category_name || tipoLabel,
      tipoLabel: tipoLabel,
      categoryBreadcrumb: business.category_name ? {
        name: business.category_name,
        url: SITE_URL + '/categoria/' + business.category_slug,
      } : null,
      tipoBreadcrumb: {
        name: tipoLabel,
        url: SITE_URL + '/search.html?tipo_negocio=' + encodeURIComponent(business.business_type || ''),
      },
    });

  } catch (error) {
    console.error('Business dynamic route error:', error);
    return new Response('Error interno del servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}