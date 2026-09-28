// functions/_lib/page-shell.js
// Plantilla HTML comun para paginas SSR (wiki de estados, medicos por
// especialidad): head con SEO + analytics, barra superior, footer y estilos.

export const BASE_URL = 'https://holax.com.ve';

export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function businessPath(b) {
  const tipo = b.tipo_negocio_slug || slugify(b.business_type || 'negocio') || 'negocio';
  return '/' + tipo + '/' + (b.category_slug || 'otro') + '/' + b.slug;
}

export function businessCard(b, extra) {
  const img = b.cover_image || '';
  return `
    <a href="${esc(businessPath(b))}" class="hx-card">
      <div class="hx-card-img">
        ${img ? `<img src="${esc(img)}" alt="${esc(b.title)}" loading="lazy" onerror="this.style.display='none'">` : '<div class="hx-card-ph"><i class="fas fa-store"></i></div>'}
        ${b.featured ? '<span class="hx-card-star"><i class="fas fa-star"></i></span>' : ''}
      </div>
      <div class="hx-card-body">
        <div class="hx-card-title">${esc(b.title)}</div>
        ${extra ? `<div class="hx-card-tag">${esc(extra)}</div>` : ''}
        <div class="hx-card-loc"><i class="fas fa-map-marker-alt"></i> ${esc([b.city, b.state].filter(Boolean).join(', '))}</div>
      </div>
    </a>`;
}

function jsonLdTag(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.description
 * @param {string} p.canonical
 * @param {string} [p.robots]
 * @param {Array<object>} [p.jsonLd]
 * @param {string} p.body       HTML inside <main>
 * @param {Array<{name:string,url?:string}>} [p.breadcrumb]
 * @param {string} [p.extraHead]
 * @param {string} [p.extraScripts]
 */
export function renderPage(p) {
  const crumbs = p.breadcrumb || [];
  const crumbHtml = crumbs.length ? `<nav class="hx-crumbs" aria-label="Ruta">${crumbs.map((c, i) =>
    i < crumbs.length - 1 && c.url ? `<a href="${esc(c.url)}">${esc(c.name)}</a><span>/</span>` : `<span aria-current="page">${esc(c.name)}</span>`
  ).join('')}</nav>` : '';

  const breadcrumbLd = crumbs.length ? [{
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url ? BASE_URL + c.url : p.canonical,
    })),
  }] : [];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TMH9V9QQ');</script>
<!-- End Google Tag Manager -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RYF2N8ZD15"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-RYF2N8ZD15');</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/jpeg" href="/images/favicon.jpeg">
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}">
    <meta name="robots" content="${esc(p.robots || 'index, follow')}">
    <link rel="canonical" href="${esc(p.canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(p.title)}">
    <meta property="og:description" content="${esc(p.description)}">
    <meta property="og:url" content="${esc(p.canonical)}">
    <meta property="og:site_name" content="HolaX">
    <meta property="og:locale" content="es_VE">
    <meta property="og:image" content="${BASE_URL}/images/Holax.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(p.title)}">
    <meta name="twitter:description" content="${esc(p.description)}">
    <meta name="twitter:image" content="${BASE_URL}/images/Holax.png">
    ${[...breadcrumbLd, ...(p.jsonLd || [])].map(jsonLdTag).join('\n    ')}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="/css/wiki.css?v=2">
    ${p.extraHead || ''}
</head>
<body class="hx-page">
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TMH9V9QQ" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <header class="hx-top">
        <div class="hx-top-inner">
            <a href="/" class="hx-logo"><img src="/images/favicon.jpeg" alt="HolaX"> HolaX</a>
            <nav class="hx-top-links">
                <a href="/search">Negocios</a>
                <a href="/medicos">Médicos</a>
                <a href="/estados">Estados</a>
            </nav>
        </div>
    </header>
    <main class="hx-main">
        ${crumbHtml}
        ${p.body}
    </main>
    <footer class="hx-footer">
        <p>&copy; ${new Date().getFullYear()} <a href="/">HolaX</a> — Directorio de negocios de Venezuela</p>
        <p><a href="/estados">Wiki de estados</a> · <a href="/medicos">Médicos por especialidad</a> · <a href="/registrar-negocio.html">Registra tu negocio</a></p>
        <p><a href="https://maps.app.goo.gl/Jz2QTADrNNneQtGd9" target="_blank" rel="noopener noreferrer">Página web desarrollada por Grupo 360 Soluciones</a></p>
    </footer>
    ${p.extraScripts || ''}
</body>
</html>`;
}

export function htmlResponse(html, canonical, status = 200) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=600',
  };
  if (canonical) headers['Link'] = `<${canonical}>; rel="canonical"`;
  return new Response(html, { status, headers });
}

export function notFound(message) {
  return htmlResponse(renderPage({
    title: 'Página no encontrada | HolaX',
    description: message,
    canonical: BASE_URL + '/',
    robots: 'noindex, follow',
    body: `<section class="hx-hero"><h1>Página no encontrada</h1><p>${esc(message)}</p><p><a class="hx-btn" href="/">Ir al inicio</a></p></section>`,
  }), null, 404);
}

/**
 * "Asesoria legal" block shown on every wiki page (config from the admin
 * panel, see wiki-store.js → mergeGlobal).
 */
export function legalCta(g, whatsappUrl, place) {
  if (!g || !g.legal_enabled) return '';
  return `
    <section class="hx-section hx-legal" id="asesoria-legal">
      <div class="hx-legal-icon"><i class="fas fa-scale-balanced"></i></div>
      <div class="hx-legal-body">
        <h2>${esc(g.legal_title)}${place ? ' en ' + esc(place) : ''}</h2>
        <p><strong>${esc(g.legal_firm)}</strong> — ${esc(g.legal_text)}</p>
      </div>
      <a class="hx-legal-btn" href="${esc(whatsappUrl)}" target="_blank" rel="noopener">
        <i class="fab fa-whatsapp"></i> ${esc(g.legal_button)}
      </a>
    </section>`;
}
