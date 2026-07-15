// functions/[tipo]/[categoria]/[slug].js
// Universal business detail route: /:tipo-de-negocio/:categoria/:nombre-negocio
// SEO-friendly URL structure for ALL businesses

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

    // Look up the tipo_negocio by slug to get its ID
    const tipoRow = await env.DB.prepare(
      'SELECT id, slug, name FROM tipos_negocio WHERE slug = ? AND is_active = 1'
    ).bind(tipo).first();

    // Also look up the category by slug
    const catRow = await env.DB.prepare(
      'SELECT id, slug, name, tipo_negocio_id FROM categories WHERE slug = ? AND is_active = 1'
    ).bind(categoria).first();

    // Build the query: find business by slug, optionally filtered by tipo+categoria
    let business;
    if (tipoRow && catRow) {
      // Full match: filter by both tipo and category
      business = await env.DB.prepare(
        `SELECT
          b.*,
          c.name as category_name,
          c.slug as category_slug,
          c.tipo_negocio_id,
          tn.slug as tipo_negocio_slug,
          tn.name as tipo_negocio_name,
          (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
          (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
        FROM businesses b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
        WHERE b.slug = ? AND b.status = 'approved' AND c.id = ?`
      ).bind(slug, catRow.id).first();
    } else if (catRow) {
      // Only category match
      business = await env.DB.prepare(
        `SELECT
          b.*,
          c.name as category_name,
          c.slug as category_slug,
          c.tipo_negocio_id,
          tn.slug as tipo_negocio_slug,
          tn.name as tipo_negocio_name,
          (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
          (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
        FROM businesses b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
        WHERE b.slug = ? AND b.status = 'approved' AND c.id = ?`
      ).bind(slug, catRow.id).first();
    } else {
      // Fallback: just by slug (no tipo/category filter)
      business = await env.DB.prepare(
        `SELECT
          b.*,
          c.name as category_name,
          c.slug as category_slug,
          c.tipo_negocio_id,
          tn.slug as tipo_negocio_slug,
          tn.name as tipo_negocio_name,
          (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image,
          (SELECT COUNT(*) FROM images WHERE business_id = b.id) as image_count
        FROM businesses b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
        WHERE b.slug = ? AND b.status = 'approved'`
      ).bind(slug).first();
    }

    if (!business) {
      // Fallback: try by numeric ID
      const numericSlug = parseInt(slug);
      if (!isNaN(numericSlug)) {
        const byId = await env.DB.prepare(
          `SELECT b.*, c.name as category_name, c.slug as category_slug,
            tn.slug as tipo_negocio_slug, tn.name as tipo_negocio_name,
            (SELECT url FROM images WHERE business_id = b.id AND is_cover = 1 LIMIT 1) as cover_image
          FROM businesses b
          LEFT JOIN categories c ON b.category_id = c.id
          LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
          WHERE b.id = ? AND b.status = 'approved'`
        ).bind(numericSlug).first();
        if (byId) {
          const correctTipo = byId.tipo_negocio_slug || slugify(byId.business_type || 'negocio');
          const correctCat = byId.category_slug || 'otro';
          return new Response('', {
            status: 301,
            headers: { 'Location': '/' + correctTipo + '/' + correctCat + '/' + byId.slug },
          });
        }
      }

      return new Response('<h1>Negocio no encontrado</h1><p>El negocio que buscas no existe o fue eliminado.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Verify URL segments match the business data — redirect if wrong
    const correctTipo = business.tipo_negocio_slug || slugify(business.business_type || 'negocio');
    const correctCat = business.category_slug || 'otro';

    if (tipo !== correctTipo || categoria !== correctCat) {
      return new Response('', {
        status: 301,
        headers: { 'Location': '/' + correctTipo + '/' + correctCat + '/' + business.slug },
      });
    }

    // Build the canonical URL and path prefix
    const pathPrefix = '/' + tipo + '/' + categoria;
    const canonicalUrl = SITE_URL + pathPrefix + '/' + business.slug;

    // Build breadcrumbs
    const tipoLabel = business.tipo_negocio_name || (business.business_type || 'Negocio').charAt(0).toUpperCase() + (business.business_type || 'negocio').slice(1);

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
        url: SITE_URL + '/' + correctTipo,
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