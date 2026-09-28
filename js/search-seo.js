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

    const h1 = isMedical
        ? 'Médicos y especialistas en ' + place
        : (slug ? 'Ver ' + label + ' en ' + place : 'Directorio de negocios en ' + place);

    let h2;
    if (isMedical) h2 = 'Encuentra profesionales de la salud, clínicas y centros médicos en ' + place
        + '. Filtra por especialidad, consulta ubicación y horarios, y agenda tu cita directamente.';
    else if (!slug) h2 = 'Busca negocios, profesionales y servicios cerca de ti';
    else if (total > 0) h2 = total + (total === 1 ? ' opción disponible' : ' opciones disponibles') + ' de ' + label + ' en ' + place;
    else h2 = 'Directorio de ' + label + ' en ' + place;

    let intro;
    if (isMedical) {
        intro = 'Cuidar de tu salud y la de tu familia empieza con encontrar al especialista indicado cerca de ti. '
            + 'En HolaX reunimos médicos, centros de diagnóstico y clínicas de ' + place + ' para que no pierdas tiempo buscando: '
            + 'compara perfiles, revisa su especialidad y ubicación, y comunícate con su consultorio en un solo clic.';
    } else if (slug) {
        intro = 'Descubre ' + label + ' en ' + place + ' con HolaX, el directorio comercial de Venezuela. Revisa fichas con fotos, '
            + 'dirección, horarios, ubicación en el mapa y reseñas de clientes, y contacta directo por WhatsApp. '
            + 'Compara opciones y elige la que mejor se adapte a lo que necesitas.';
    } else {
        intro = 'Explora el directorio comercial de HolaX en ' + place + ': restaurantes, farmacias, tiendas, profesionales, '
            + 'servicios médicos y mucho más. Filtra por estado, categoría o ciudad, mira cada negocio en el mapa '
            + 'y contáctalo directo por WhatsApp.';
    }

    const trust = isMedical
        ? (total > 0 ? total + (total === 1 ? ' profesional' : ' profesionales') + ' en ' + place + ' · ' : '')
            + 'Contacto directo por WhatsApp y ubicación en el mapa de cada consultorio.'
        : '';

    const title = isMedical
        ? 'Médicos y especialistas en ' + place + ' | Directorio médico HolaX'
        : slug
        ? capitalize(label) + ' en ' + place + ' | Directorio HolaX'
        : 'Explorar Negocios en ' + place + ' | HolaX';

    const description = truncate(
        isMedical
            ? 'Médicos y especialistas en ' + place + (total > 0 ? ': ' + total + (total === 1 ? ' profesional' : ' profesionales') + ' de la salud' : '')
              + ', clínicas y centros médicos con dirección, horarios, mapa y WhatsApp para agendar tu cita.'
            : slug
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
        h1, h2, intro, trust, title, description, canonical, faq, jsonLd, isMedical, place,
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

/**
 * Medical landing blocks (search?categoria=medicina-servicio-medico):
 * specialties that really have doctors in the place + what each profile
 * includes + call to action for doctors.
 * @param {object} seo            result of buildSearchSeo
 * @param {Array}  specialties    [{slug, name, desc, count}] with count > 0
 * @param {string} [estadoSlug]   state slug for /medicos/:esp/:estado links
 */
export function renderMedicalBlocks(seo, specialties, estadoSlug) {
    const place = escapeHtml(seo.place);
    const list = (specialties || []).filter(e => e.count > 0);
    const specialtiesHtml = list.length
        ? '<h2 class="med-title">Especialidades médicas disponibles en ' + place + '</h2>'
            + '<p class="med-sub">Encuentra atención personalizada según lo que necesitas hoy:</p>'
            + '<div class="med-esp-grid">' + list.map(e =>
                '<a class="med-esp" href="/medicos/' + encodeURIComponent(e.slug) + (estadoSlug ? '/' + encodeURIComponent(estadoSlug) : '') + '">'
                + '<strong>' + escapeHtml(e.name) + ' <span>' + e.count + '</span></strong>'
                + (e.desc ? '<small>' + escapeHtml(e.desc) + '</small>' : '') + '</a>'
            ).join('') + '</div>'
        : '';

    const infoHtml = '<h2 class="med-title">Toda la información que necesitas antes de tu consulta</h2>'
        + '<p class="med-sub">Cada ficha del directorio reúne los datos del consultorio en un solo lugar:</p>'
        + '<ul class="med-info">'
        + '<li><i class="fas fa-user-doctor"></i><div><strong>Profesional y especialidad</strong><span>Nombre del médico o centro de salud y su área de atención.</span></div></li>'
        + '<li><i class="fas fa-location-dot"></i><div><strong>Dirección y mapa</strong><span>Consultorio, clínica o torre médica en ' + place + ' con ubicación en el mapa.</span></div></li>'
        + '<li><i class="fas fa-clock"></i><div><strong>Horarios de atención</strong><span>Días de consulta, previa cita o por orden de llegada.</span></div></li>'
        + '<li><i class="fab fa-whatsapp"></i><div><strong>Contacto directo</strong><span>Botón de WhatsApp, llamada telefónica y redes sociales.</span></div></li>'
        + '<li><i class="fas fa-notes-medical"></i><div><strong>Servicios y procedimientos</strong><span>Tratamientos, estudios o cirugías que realiza.</span></div></li>'
        + '</ul>'
        + '<p class="med-note">La información de cada ficha la proporciona el propio profesional o centro de salud.</p>'
        + '<div class="med-cta">'
        + '<h2>¿Eres médico o representas un centro de salud en ' + place + '?</h2>'
        + '<p>Llega a más pacientes que buscan tus servicios a diario en internet. Registra tu consultorio, completa tu ficha en el directorio de HolaX y recibe consultas directas en tu WhatsApp.</p>'
        + '<a class="med-cta-btn" href="/registrar-negocio.html"><i class="fas fa-stethoscope"></i> Registrar mi consultorio médico</a>'
        + '</div>';

    return { specialtiesHtml, infoHtml };
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
    set('searchTrust', seo.trust);
    const trustEl = document.getElementById('searchTrust');
    if (trustEl) trustEl.hidden = !seo.trust;

    const espEl = document.getElementById('searchMedSpecialties');
    const infoEl = document.getElementById('searchMedInfo');
    if (seo.isMedical) {
        // Static part now; specialties with real counts from the API
        const blocks = renderMedicalBlocks(seo, []);
        if (infoEl) { infoEl.innerHTML = blocks.infoHtml; infoEl.hidden = false; }
        const url = '/api/medicos/especialidades' + (o.stateName ? '?estado=' + encodeURIComponent(o.stateName) : '');
        fetch(url).then(r => (r.ok ? r.json() : null)).then(data => {
            if (!data || !espEl) return;
            const html = renderMedicalBlocks(seo, data.especialidades || [], data.estado && data.estado.slug).specialtiesHtml;
            espEl.innerHTML = html;
            espEl.hidden = !html;
        }).catch(() => {});
    } else {
        if (espEl) { espEl.innerHTML = ''; espEl.hidden = true; }
        if (infoEl) { infoEl.innerHTML = ''; infoEl.hidden = true; }
    }

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
