// functions/search.js
// GET /search?categoria=...&estado=...
//
// Serves the static search.html but, when a category is requested, rewrites
// the <title>, meta description, canonical, Open Graph, H1/H2/intro, FAQ and
// JSON-LD on the server (HTMLRewriter). This way Google sees the landing
// content without running JavaScript. The browser then keeps it updated when
// filters change (js/search-seo.js is shared by both sides).

import { buildSearchSeo, renderFaqHtml, renderMedicalBlocks } from '../js/search-seo.js';
import { especialidadesConMedicos, MEDICAL_CATEGORY } from './_lib/medicos.js';

async function fetchListing(env, category, estado, ciudad) {
  const conditions = ["b.status = 'approved'", 'b.category_id = ?'];
  const bindings = [category.id];
  if (estado) { conditions.push('b.state = ?'); bindings.push(estado); }
  if (ciudad) { conditions.push('b.city LIKE ?'); bindings.push('%' + ciudad + '%'); }
  const where = conditions.join(' AND ');

  const countRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM businesses b WHERE ${where}`)
    .bind(...bindings).first();

  let rows;
  try {
    rows = await env.DB.prepare(
      `SELECT b.id, b.title, b.slug, c.slug as category_slug, tn.slug as tipo_negocio_slug
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
       WHERE ${where}
       ORDER BY b.featured DESC, b.created_at DESC
       LIMIT 20`
    ).bind(...bindings).all();
  } catch (e) {
    rows = await env.DB.prepare(
      `SELECT b.id, b.title, b.slug, c.slug as category_slug
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE ${where}
       ORDER BY b.featured DESC, b.created_at DESC
       LIMIT 20`
    ).bind(...bindings).all();
  }

  return { total: (countRow && countRow.total) || 0, businesses: rows.results || [] };
}

function setContent(value) {
  return { element(el) { el.setInnerContent(value); } };
}

function setAttr(name, value) {
  return { element(el) { el.setAttribute(name, value); } };
}

export async function onRequestGet(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const categoria = (url.searchParams.get('categoria') || '').trim();

  if (!categoria || !env.DB) return next();

  // Always get the full static page (not a 304) so it can be rewritten
  const assetRequest = new Request(request);
  assetRequest.headers.delete('If-None-Match');
  assetRequest.headers.delete('If-Modified-Since');
  const res = await next(assetRequest);

  try {
    if (res.status !== 200 || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;

    // SELECT * so a missing optional column (banner_url) can't break the page
    const category = await env.DB.prepare('SELECT * FROM categories WHERE slug = ?')
      .bind(categoria).first();
    if (!category) return res;

    const estado = (url.searchParams.get('estado') || '').trim();
    const ciudad = (url.searchParams.get('ciudad') || url.searchParams.get('city') || '').trim();
    const page = parseInt(url.searchParams.get('page'), 10) || 1;
    const refined = !!(url.searchParams.get('q') || ciudad || url.searchParams.get('especialidad') ||
      url.searchParams.get('tipo_negocio') || page > 1);

    const { total, businesses } = await fetchListing(env, category, estado, ciudad);

    const seo = buildSearchSeo({
      categorySlug: category.slug,
      categoryName: category.name,
      stateName: estado,
      city: ciudad,
      total,
      businesses,
      refined,
    });

    // Medical landing: specialties with real doctors in this state + profile info + CTA
    let medical = null;
    if (category.slug === MEDICAL_CATEGORY) {
      const esp = await especialidadesConMedicos(env, estado);
      medical = renderMedicalBlocks(seo, esp.especialidades, esp.estado && esp.estado.slug);
    }

    // Prevent "</script>" inside data from closing the JSON-LD block
    const jsonLd = seo.jsonLd.replace(/</g, '\\u003c');

    const headers = new Headers(res.headers);
    headers.delete('ETag');
    headers.set('Cache-Control', 'public, max-age=300');
    const base = new Response(res.body, { status: res.status, headers });

    return new HTMLRewriter()
      .on('title', setContent(seo.title))
      .on('meta[name="description"]', setAttr('content', seo.description))
      .on('link[rel="canonical"]', setAttr('href', seo.canonical))
      .on('meta[property="og:title"]', setAttr('content', seo.title))
      .on('meta[property="og:description"]', setAttr('content', seo.description))
      .on('meta[property="og:url"]', setAttr('content', seo.canonical))
      .on('meta[name="twitter:title"]', setAttr('content', seo.title))
      .on('meta[name="twitter:description"]', setAttr('content', seo.description))
      .on('head', {
        element(el) {
          el.append(`<meta name="robots" content="${seo.robots}">`, { html: true });
          el.append(`<script type="application/ld+json" id="searchJsonLd">${jsonLd}</script>`, { html: true });
        },
      })
      .on('#categoryBanner', {
        element(el) {
          if (category.banner_url) el.setAttribute('style', 'display:block;');
        },
      })
      .on('#categoryBannerImg', {
        element(el) {
          if (category.banner_url) {
            el.setAttribute('src', category.banner_url);
            el.setAttribute('alt', category.name || '');
            el.setAttribute('fetchpriority', 'high');
          }
        },
      })
      .on('#searchH1', setContent(seo.h1))
      .on('#searchH2', setContent(seo.h2))
      .on('#searchIntro', setContent(seo.intro))
      .on('#searchTrust', {
        element(el) {
          el.setInnerContent(seo.trust || '');
          if (seo.trust) el.removeAttribute('hidden');
        },
      })
      .on('#searchMedSpecialties', {
        element(el) {
          if (medical && medical.specialtiesHtml) {
            el.setInnerContent(medical.specialtiesHtml, { html: true });
            el.removeAttribute('hidden');
          }
        },
      })
      .on('#searchMedInfo', {
        element(el) {
          if (medical) {
            el.setInnerContent(medical.infoHtml, { html: true });
            el.removeAttribute('hidden');
          }
        },
      })
      .on('#searchFaq', {
        element(el) {
          el.setInnerContent(renderFaqHtml(seo), { html: true });
          el.removeAttribute('hidden');
        },
      })
      .transform(base);
  } catch (error) {
    console.error('search SSR error:', error);
    return res;
  }
}
