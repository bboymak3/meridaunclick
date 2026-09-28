/**
 * HolaX - Search landing SEO (search.html?categoria=...&estado=...)
 *
 * Shared by the browser (loaded as <script type="module">) and the Pages
 * Function functions/search.js, which uses it to render the same H1/H2/intro,
 * meta tags and JSON-LD on the server so Google sees them without running JS.
 */

export const BASE_URL = 'https://holax.com.ve';

// Friendlier names for categories whose admin name reads badly in a heading.
const CATEGORY_LABELS = {
    'medicina-servicio-medico': 'médicos y servicios de salud',
};

const MEDICAL = 'medicina-servicio-medico';

function prettifySlug(slug) {
    return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function truncate(str, max) {
    if (str.length <= max) return str;
    return str.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/** Canonical URL of a business card (matches functions/[tipo]/[categoria]/[slug].js). */
export function businessCanonicalPath(b) {
    if (!b) return '/';
    if (b.slug && b.category_slug && b.tipo_negocio_slug) {
        return '/' + b.tipo_negocio_slug + '/' + b.category_slug + '/' + b.slug;
    }
    if (b.slug) return '/negocio/' + b.slug;
    return '/business.html?id=' + b.id;
}

export function searchCanonical(categorySlug, stateName) {
    let url = BASE_URL + '/search';
    const params = [];
    if (categorySlug) params.push('categoria=' + encodeURIComponent(categorySlug));
    if (stateName) params.push('estado=' + encodeURIComponent(stateName));
    return params.length ? url + '?' + params.join('&') : url;
}

/**
 * @param {object} o
 * @param {string} o.categorySlug
 * @param {string} [o.categoryName]  name from the categories table
 * @param {string} [o.stateName]
 * @param {string} [o.city]
 * @param {number} [o.total]         number of matching businesses
 * @param {Array}  [o.businesses]    first page of results (for ItemList)
 * @param {boolean} [o.refined]      true when free-text/city/page filters are applied
 */
export function buildSearchSeo(o) {
    const slug = o.categorySlug || '';
    const isMedical = slug === MEDICAL;
    const categoryName = o.categoryName || prettifySlug(slug);
    const label = CATEGORY_LABELS[slug] || categoryName.toLowerCase();
    const place = o.city ? (o.city + (o.stateName ? ', ' + o.stateName : '')) : (o.stateName || 'Venezuela');
    const total = Number(o.total) || 0;

    const h1 = slug ? 'Ver ' + label + ' en ' + place : 'Directorio de negocios en ' + place;

    let h2;
    if (!slug) h2 = 'Busca negocios, profesionales y servicios cerca de ti';
    else if (total > 0) h2 = total + (total === 1 ? ' opción disponible' : ' opciones disponibles') + ' de ' + label + ' en ' + place;
    else h2 = 'Directorio de ' + label + ' en ' + place;

    let intro;
    if (isMedical) {
        intro = 'Encuentra médicos y servicios de salud en ' + place + ': especialistas, consultorios y clínicas con dirección, '
            + 'horarios, ubicación en el mapa y contacto directo por WhatsApp. Compara opciones, revisa reseñas de pacientes '
            + 'y agenda tu consulta de forma rápida y segura en HolaX.';
    } else if (slug) {
        intro = 'Descubre ' + label + ' en ' + place + ' con HolaX, el directorio comercial de Venezuela. Revisa fichas con fotos, '
            + 'dirección, horarios, ubicación en el mapa y reseñas de clientes, y contacta directo por WhatsApp. '
            + 'Compara opciones y elige la que mejor se adapte a lo que necesitas.';
    } else {
        intro = 'Explora el directorio comercial de HolaX en ' + place + ': restaurantes, farmacias, tiendas, profesionales, '
            + 'servicios médicos y mucho más. Filtra por estado, categoría o ciudad, mira cada negocio en el mapa '
            + 'y contáctalo directo por WhatsApp.';
    }

    const title = slug
        ? capitalize(label) + ' en ' + place + ' | Directorio HolaX'
        : 'Explorar Negocios en ' + place + ' | HolaX';

    const description = truncate(
        slug
            ? capitalize(label) + ' en ' + place + (total > 0 ? ': ' + total + (total === 1 ? ' opción' : ' opciones') : '') +
              ' con dirección, horarios, mapa, reseñas y WhatsApp directo. Directorio actualizado en HolaX.'
            : 'Busca negocios en ' + place + ': restaurantes, farmacias, tiendas, profesionales y servicios. Dirección, mapa y WhatsApp en HolaX.',
        160
    );

    const canonical = searchCanonical(slug, o.stateName);

    const faq = slug ? [
        {
            q: '¿Cómo encuentro ' + label + ' en ' + place + '?',
            a: 'En HolaX puedes ver todas las opciones de ' + label + ' en ' + place + '. Usa la lupa para filtrar por estado, '
                + 'ciudad o palabra clave' + (isMedical ? ' y especialidad médica' : '') + ', y abre cada ficha para ver dirección, horarios y ubicación en el mapa.',
        },
        {
            q: isMedical ? '¿Cómo agendo una consulta?' : '¿Cómo contacto a un negocio?',
            a: 'Cada ficha tiene botones de contacto directo por WhatsApp y teléfono. También puedes enviar un mensaje desde HolaX o dejar una reseña después de tu visita.',
        },
        {
            q: isMedical ? '¿Cómo registro mi consultorio en HolaX?' : '¿Cómo registro mi negocio en HolaX?',
            a: 'Crea tu cuenta y publica tu ' + (isMedical ? 'consultorio o servicio médico' : 'negocio') + ' gratis en holax.com.ve/registrar-negocio.html. '
                + 'Tu ficha aparecerá en el directorio, en el mapa y en los resultados de búsqueda.',
        },
    ] : [];

    // ─── JSON-LD ───
    const breadcrumb = [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL + '/' }];
    if (slug) breadcrumb.push({ '@type': 'ListItem', position: 2, name: capitalize(label), item: searchCanonical(slug) });
    if (slug && o.stateName) breadcrumb.push({ '@type': 'ListItem', position: 3, name: o.stateName, item: canonical });

    const graph = [
        {
            '@type': 'CollectionPage',
            '@id': canonical + '#page',
            url: canonical,
            name: h1,
            headline: h1,
            description: description,
            inLanguage: 'es-VE',
            isPartOf: { '@type': 'WebSite', name: 'HolaX', url: BASE_URL + '/' },
            about: slug ? { '@type': 'Thing', name: categoryName } : undefined,
            spatialCoverage: { '@type': 'Place', name: place + (o.stateName || o.city ? ', Venezuela' : '') },
        },
        { '@type': 'BreadcrumbList', itemListElement: breadcrumb },
    ];

    const list = (o.businesses || []).filter(b => b && (b.slug || b.id)).slice(0, 20);
    if (list.length) {
        graph.push({
            '@type': 'ItemList',
            name: h1,
            numberOfItems: total || list.length,
            itemListElement: list.map((b, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: BASE_URL + businessCanonicalPath(b),
                name: b.title || '',
            })),
        });
    }

    if (faq.length) {
        graph.push({
            '@type': 'FAQPage',
            mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        });
    }

    const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });

    return {
        h1, h2, intro, title, description, canonical, faq, jsonLd,
        robots: o.refined ? 'noindex, follow' : 'index, follow',
    };
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderFaqHtml(seo) {
    if (!seo.faq || !seo.faq.length) return '';
    return '<h2 class="search-faq-title">Preguntas frecuentes</h2>' + seo.faq.map(f =>
        '<details class="search-faq-item"><summary>' + escapeHtml(f.q) + '</summary><p>' + escapeHtml(f.a) + '</p></details>'
    ).join('');
}

// ─── Browser: apply to the current document ───
function setMeta(selector, attr, value, create) {
    let el = document.head.querySelector(selector);
    if (!el && create) {
        el = document.createElement(create.tag);
        Object.keys(create.attrs).forEach(k => el.setAttribute(k, create.attrs[k]));
        document.head.appendChild(el);
    }
    if (el) el.setAttribute(attr, value);
}

export function applySearchSeo(o) {
    const seo = buildSearchSeo(o);
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('searchH1', seo.h1);
    set('searchH2', seo.h2);
    set('searchIntro', seo.intro);

    const faqEl = document.getElementById('searchFaq');
    if (faqEl) {
        faqEl.innerHTML = renderFaqHtml(seo);
        faqEl.hidden = !seo.faq.length;
    }

    document.title = seo.title;
    setMeta('meta[name="description"]', 'content', seo.description);
    setMeta('meta[name="robots"]', 'content', seo.robots, { tag: 'meta', attrs: { name: 'robots' } });
    setMeta('link[rel="canonical"]', 'href', seo.canonical, { tag: 'link', attrs: { rel: 'canonical' } });
    setMeta('meta[property="og:title"]', 'content', seo.title);
    setMeta('meta[property="og:description"]', 'content', seo.description);
    setMeta('meta[property="og:url"]', 'content', seo.canonical);
    setMeta('meta[name="twitter:title"]', 'content', seo.title);
    setMeta('meta[name="twitter:description"]', 'content', seo.description);

    let ld = document.getElementById('searchJsonLd');
    if (!ld) {
        ld = document.createElement('script');
        ld.type = 'application/ld+json';
        ld.id = 'searchJsonLd';
        document.head.appendChild(ld);
    }
    ld.textContent = seo.jsonLd;
    return seo;
}

if (typeof window !== 'undefined') {
    window.HolaxSearchSEO = { apply: applySearchSeo, build: buildSearchSeo };
}
