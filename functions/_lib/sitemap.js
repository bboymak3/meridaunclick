// functions/_lib/sitemap.js
// Shared builders for the XML sitemaps.
//
//   /sitemap.xml            -> sitemap index (lists the files below)
//   /sitemap-paginas.xml    -> static pages, categories, states, category+state landings
//   /sitemap-negocios.xml   -> business pages (except medical)
//   /sitemap-medicos.xml    -> medical businesses + medical landings by state
//   /sitemap-productos.xml  -> marketplace products
//
// Only canonical URLs are listed (no /negocio/:slug redirects, no /web/:slug,
// whose canonical points to the business page).

export const BASE_URL = 'https://holax.com.ve';
export const MEDICAL_CATEGORY = 'medicina-servicio-medico';

export const SITEMAP_FILES = ['paginas', 'negocios', 'medicos', 'productos'];

// Public static pages. No <lastmod>: a date that always says "today" is ignored
// by Google, so it's better to omit it.
const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/search.html', priority: '0.9', changefreq: 'daily' },
  { loc: '/registrar-negocio.html', priority: '0.9', changefreq: 'monthly' },
  { loc: '/marketplace.html', priority: '0.8', changefreq: 'daily' },
  { loc: '/map.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/empleo.html', priority: '0.7', changefreq: 'daily' },
  { loc: '/properties.html', priority: '0.7', changefreq: 'daily' },
  { loc: '/entretenimiento.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/reservas.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/cupones.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/emergencia.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/eventos.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/planes.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/quienes-somos.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/mision-vision.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/clientes-satisfechos.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/contacto.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/privacidad.html', priority: '0.4', changefreq: 'yearly' },
  { loc: '/eliminacion-datos.html', priority: '0.3', changefreq: 'yearly' },
];

export function slugify(text) {
  if (!text) return '';
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toDate(value) {
  if (!value) return '';
  const d = String(value).substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

// Absolute URL for an image stored as "/api/serve?key=..." or a full URL.
function absoluteImage(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return BASE_URL + u;
  return '';
}

function firstProductImage(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed[0] || '';
  } catch (e) { /* plain URL */ }
  return raw;
}

function urlEntry({ loc, lastmod, priority, changefreq, image, imageTitle }) {
  let xml = `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
  if (changefreq) xml += `    <changefreq>${changefreq}</changefreq>\n`;
  if (priority) xml += `    <priority>${priority}</priority>\n`;
  const img = absoluteImage(image);
  if (img) {
    xml += `    <image:image>\n      <image:loc>${xmlEscape(img)}</image:loc>\n`;
    if (imageTitle) xml += `      <image:title>${xmlEscape(imageTitle)}</image:title>\n`;
    xml += `    </image:image>\n`;
  }
  return xml + `  </url>\n`;
}

function urlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('')}</urlset>`;
}

export function xmlResponse(xml) {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// URL of a category (optionally filtered by state) on the search landing page.
export function searchLandingUrl(categorySlug, stateName) {
  let url = `${BASE_URL}/search?categoria=${encodeURIComponent(categorySlug)}`;
  if (stateName) url += `&estado=${encodeURIComponent(stateName)}`;
  return url;
}

// ─── Data ────────────────────────────────────────────────────────

async function fetchBusinesses(env) {
  const base = `
    SELECT b.id, b.title, b.slug, b.business_type, b.updated_at, b.created_at,
           c.slug as category_slug, TIPO_COL
           (SELECT url FROM images WHERE business_id = b.id ORDER BY is_cover DESC, order_index ASC LIMIT 1) as image
    FROM businesses b
    LEFT JOIN categories c ON b.category_id = c.id
    TIPO_JOIN
    WHERE b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
    ORDER BY b.updated_at DESC`;
  try {
    const r = await env.DB.prepare(
      base.replace('TIPO_COL', 'tn.slug as tipo_slug,')
          .replace('TIPO_JOIN', 'LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id')
    ).all();
    return r.results || [];
  } catch (e) {
    const r = await env.DB.prepare(base.replace('TIPO_COL', '').replace('TIPO_JOIN', '')).all();
    return r.results || [];
  }
}

function businessEntry(biz) {
  const tipo = biz.tipo_slug || slugify(biz.business_type || 'negocio');
  const cat = biz.category_slug || 'otro';
  return urlEntry({
    loc: `${BASE_URL}/${tipo}/${cat}/${biz.slug}`,
    lastmod: toDate(biz.updated_at || biz.created_at),
    priority: '0.8',
    changefreq: 'weekly',
    image: biz.image,
    imageTitle: biz.title,
  });
}

// Category + state pairs that actually have businesses.
async function fetchCategoryStates(env) {
  try {
    const r = await env.DB.prepare(
      `SELECT c.slug as category_slug, TRIM(b.state) as state, MAX(COALESCE(b.updated_at, b.created_at)) as last_updated
       FROM businesses b
       INNER JOIN categories c ON b.category_id = c.id
       WHERE b.status = 'approved' AND b.state IS NOT NULL AND TRIM(b.state) != ''
       GROUP BY c.slug, TRIM(b.state)`
    ).all();
    return r.results || [];
  } catch (e) {
    return [];
  }
}

// ─── Sitemaps ────────────────────────────────────────────────────

export function buildIndex() {
  const items = SITEMAP_FILES.map(name =>
    `  <sitemap>\n    <loc>${BASE_URL}/sitemap-${name}.xml</loc>\n  </sitemap>\n`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}</sitemapindex>`;
}

export async function buildPaginas(env) {
  const entries = STATIC_PAGES.map(p => urlEntry({ loc: BASE_URL + p.loc, priority: p.priority, changefreq: p.changefreq }));

  // Categories with approved businesses
  try {
    const r = await env.DB.prepare(
      `SELECT c.slug, MAX(COALESCE(b.updated_at, b.created_at)) as last_updated
       FROM categories c
       INNER JOIN businesses b ON b.category_id = c.id AND b.status = 'approved' AND b.slug IS NOT NULL AND b.slug != ''
       GROUP BY c.id`
    ).all();
    for (const cat of r.results || []) {
      if (!cat.slug) continue;
      entries.push(urlEntry({ loc: `${BASE_URL}/categoria/${cat.slug}`, lastmod: toDate(cat.last_updated), priority: '0.7', changefreq: 'weekly' }));
    }
  } catch (e) { /* categories table missing */ }

  // States with approved businesses (deduplicated by slug)
  try {
    const r = await env.DB.prepare(
      `SELECT TRIM(state) as state, MAX(COALESCE(updated_at, created_at)) as last_updated
       FROM businesses WHERE status = 'approved' AND state IS NOT NULL AND TRIM(state) != ''
       GROUP BY TRIM(state)`
    ).all();
    const seen = new Map();
    for (const st of r.results || []) {
      const slug = slugify(st.state);
      if (!slug) continue;
      const prev = seen.get(slug);
      if (!prev || (st.last_updated || '') > (prev || '')) seen.set(slug, st.last_updated);
    }
    for (const [slug, last] of seen) {
      entries.push(urlEntry({ loc: `${BASE_URL}/estado/${slug}`, lastmod: toDate(last), priority: '0.6', changefreq: 'weekly' }));
    }
  } catch (e) { /* ignore */ }

  // Category + state landings (non-medical; medical ones go in sitemap-medicos)
  for (const cs of await fetchCategoryStates(env)) {
    if (!cs.category_slug || cs.category_slug === MEDICAL_CATEGORY) continue;
    entries.push(urlEntry({ loc: searchLandingUrl(cs.category_slug, cs.state), lastmod: toDate(cs.last_updated), priority: '0.6', changefreq: 'weekly' }));
  }

  return urlset(entries);
}

export async function buildNegocios(env) {
  const entries = [];
  try {
    for (const biz of await fetchBusinesses(env)) {
      if (biz.category_slug === MEDICAL_CATEGORY) continue;
      entries.push(businessEntry(biz));
    }
  } catch (e) { /* ignore */ }
  return urlset(entries);
}

export async function buildMedicos(env) {
  const entries = [];
  let latest = '';
  try {
    for (const biz of await fetchBusinesses(env)) {
      if (biz.category_slug !== MEDICAL_CATEGORY) continue;
      entries.push(businessEntry(biz));
      const d = toDate(biz.updated_at || biz.created_at);
      if (d > latest) latest = d;
    }
  } catch (e) { /* ignore */ }

  // Medical landing pages: all of Venezuela + one per state
  entries.unshift(urlEntry({ loc: searchLandingUrl(MEDICAL_CATEGORY), lastmod: latest, priority: '0.9', changefreq: 'daily' }));
  for (const cs of await fetchCategoryStates(env)) {
    if (cs.category_slug !== MEDICAL_CATEGORY) continue;
    entries.push(urlEntry({ loc: searchLandingUrl(MEDICAL_CATEGORY, cs.state), lastmod: toDate(cs.last_updated), priority: '0.8', changefreq: 'weekly' }));
  }
  return urlset(entries);
}

export async function buildProductos(env) {
  const entries = [];
  try {
    const r = await env.DB.prepare(
      // SELECT * so a missing optional column (e.g. updated_at) can't drop every product
      "SELECT * FROM products WHERE (status = 'approved' OR status IS NULL) AND slug IS NOT NULL AND slug != '' ORDER BY created_at DESC"
    ).all();
    for (const prod of r.results || []) {
      entries.push(urlEntry({
        loc: `${BASE_URL}/producto/${slugify(prod.category || 'general') || 'general'}/${prod.slug}`,
        lastmod: toDate(prod.updated_at || prod.created_at),
        priority: '0.7',
        changefreq: 'weekly',
        image: firstProductImage(prod.image),
        imageTitle: prod.name,
      }));
    }
  } catch (e) { /* products table / slug column missing */ }
  return urlset(entries);
}
