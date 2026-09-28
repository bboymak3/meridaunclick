// functions/estado/[slug].js
// GET /estado/:slug — Wiki del estado + directorio local.
// Reseña, ficha de datos, clima en vivo, emergencias, tramites, municipios,
// economia, que visitar, medicos por especialidad y negocios del estado.

import { ESTADOS, EMERGENCIAS_NACIONALES, ORGANISMOS, findEstado, formatNumber } from '../_lib/estados-data.js';
import { BASE_URL, esc, renderPage, htmlResponse, notFound, businessCard, businessPath } from '../_lib/page-shell.js';
import { matchEspecialidades } from '../../js/especialidades.js';

const EMERGENCY_LABELS = {
  policia: 'Policía', bomberos: 'Bomberos', ambulancia: 'Ambulancias', hospital: 'Hospitales y clínicas',
  proteccion_civil: 'Protección Civil', transito: 'Tránsito', otro: 'Otros',
};

async function safeAll(env, sql, bindings) {
  try {
    const r = await env.DB.prepare(sql).bind(...bindings).all();
    return r.results || [];
  } catch (e) {
    return [];
  }
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const estado = findEstado(decodeURIComponent(params.slug || ''));
  if (!estado) return notFound('El estado que buscas no está disponible.');

  // Canonical slug (e.g. /estado/Mérida or /estado/la-guaira → /estado/merida, /estado/vargas)
  if (params.slug !== estado.slug) {
    return new Response('', { status: 301, headers: { Location: '/estado/' + estado.slug } });
  }

  const canonical = `${BASE_URL}/estado/${estado.slug}`;
  const names = estado.dbNames;
  const inList = names.map(() => '?').join(', ');
  const searchState = names[0];

  let businesses = [], categories = [], cities = [], emergencies = [], medicos = [];
  if (env.DB) {
    const stateWhere = `TRIM(b.state) COLLATE NOCASE IN (${inList}) AND b.status = 'approved'`;
    businesses = await safeAll(env,
      `SELECT b.id, b.title, b.slug, b.city, b.state, b.business_type, b.featured,
              c.name as category_name, c.slug as category_slug, tn.slug as tipo_negocio_slug,
              (SELECT url FROM images WHERE business_id = b.id ORDER BY is_cover DESC, order_index ASC LIMIT 1) as cover_image
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id
       WHERE ${stateWhere} AND b.slug IS NOT NULL AND b.slug != ''
       ORDER BY b.featured DESC, b.created_at DESC LIMIT 24`, names);
    if (!businesses.length) {
      businesses = await safeAll(env,
        `SELECT b.id, b.title, b.slug, b.city, b.state, b.business_type, b.featured,
                c.name as category_name, c.slug as category_slug
         FROM businesses b LEFT JOIN categories c ON b.category_id = c.id
         WHERE ${stateWhere} AND b.slug IS NOT NULL AND b.slug != ''
         ORDER BY b.featured DESC, b.created_at DESC LIMIT 24`, names);
    }
    categories = await safeAll(env,
      `SELECT c.name, c.slug, c.icon, COUNT(b.id) as count
       FROM businesses b JOIN categories c ON b.category_id = c.id
       WHERE ${stateWhere} GROUP BY c.id ORDER BY count DESC LIMIT 24`, names);
    cities = await safeAll(env,
      `SELECT TRIM(b.city) as city, COUNT(*) as count FROM businesses b
       WHERE ${stateWhere} AND b.city IS NOT NULL AND TRIM(b.city) != ''
       GROUP BY TRIM(b.city) ORDER BY count DESC LIMIT 20`, names);
    medicos = await safeAll(env,
      `SELECT b.especialidad FROM businesses b JOIN categories c ON b.category_id = c.id
       WHERE ${stateWhere} AND c.slug = 'medicina-servicio-medico' AND b.especialidad IS NOT NULL AND b.especialidad != ''`, names);
    emergencies = await safeAll(env,
      `SELECT name, category, phone, address, city, is_24h, website FROM emergency_services
       WHERE is_active = 1 AND TRIM(state) COLLATE NOCASE IN (${inList})
       ORDER BY category, name LIMIT 60`, names);
  }

  // Specialty counts in this state
  const espCounts = new Map();
  for (const m of medicos) {
    for (const e of matchEspecialidades(m.especialidad)) {
      const cur = espCounts.get(e.slug) || { e, count: 0 };
      cur.count++;
      espCounts.set(e.slug, cur);
    }
  }
  const espList = [...espCounts.values()].sort((a, b) => b.count - a.count);

  const density = estado.area ? Math.round(estado.population / estado.area) : 0;
  const nMun = estado.municipios.length;
  const wikiUrl = 'https://es.wikipedia.org/wiki/' + encodeURIComponent(estado.wiki);

  const title = `${estado.name}, Venezuela: capital, municipios, clima y emergencias | HolaX`;
  const description = `Guía de ${estado.name}: capital ${estado.capital}, ${nMun} ${nMun === 1 ? 'municipio' : 'municipios'}, ${formatNumber(estado.area)} km², clima, números de emergencia, economía y directorio de negocios.`.slice(0, 160);

  // ─── Emergencies grouped by category ───
  const emGroups = {};
  for (const s of emergencies) (emGroups[s.category || 'otro'] = emGroups[s.category || 'otro'] || []).push(s);
  const localEmergencies = Object.keys(emGroups).map(cat => `
      <div class="hx-em-group">
        <h4>${esc(EMERGENCY_LABELS[cat] || cat)}</h4>
        ${emGroups[cat].map(s => `
          <div class="hx-em-item">
            <div><strong>${esc(s.name)}</strong>${s.city ? `<small>${esc(s.city)}</small>` : ''}${s.is_24h ? '<span class="hx-pill">24h</span>' : ''}</div>
            ${s.phone ? `<a class="hx-tel" href="tel:${esc(String(s.phone).replace(/[^0-9+]/g, ''))}"><i class="fas fa-phone"></i> ${esc(s.phone)}</a>` : ''}
          </div>`).join('')}
      </div>`).join('');

  const faq = [
    { q: `¿Cuál es la capital del estado ${estado.name}?`, a: `La capital de ${estado.name} es ${estado.capital}.` },
    { q: `¿Cuántos municipios tiene ${estado.name}?`, a: `${estado.name} tiene ${nMun} ${nMun === 1 ? 'municipio' : 'municipios'}: ${estado.municipios.join(', ')}.` },
    { q: `¿Cuál es el número de emergencia en ${estado.name}?`, a: `En ${estado.name}, como en toda Venezuela, el número de emergencias es el 911 (VEN 911), que atiende policía, bomberos y ambulancias.` },
    { q: `¿Cómo es el clima de ${estado.name}?`, a: estado.clima },
    { q: `¿Cuántos habitantes tiene ${estado.name}?`, a: `Según el Censo 2011 del INE, ${estado.name} tenía ${formatNumber(estado.population)} habitantes, en una superficie aproximada de ${formatNumber(estado.area)} km².` },
  ];

  const otherStates = ESTADOS.filter(e => e.slug !== estado.slug)
    .map(e => `<a href="/estado/${e.slug}" class="hx-chip">${esc(e.name)}</a>`).join('');

  const body = `
    <section class="hx-hero">
      <p class="hx-kicker"><i class="fas fa-map-location-dot"></i> Wiki de Venezuela · Región ${esc(estado.region)}</p>
      <h1>${esc(estado.name)}, Venezuela</h1>
      <h2 class="hx-sub">Capital: ${esc(estado.capital)} · ${nMun} ${nMun === 1 ? 'municipio' : 'municipios'} · ${formatNumber(estado.population)} habitantes</h2>
      <p class="hx-lead">${esc(estado.resena)}</p>
      <div class="hx-actions">
        <a class="hx-btn" href="#directorio"><i class="fas fa-store"></i> Negocios en ${esc(estado.name)}</a>
        <a class="hx-btn hx-btn-red" href="#emergencias"><i class="fas fa-phone-volume"></i> Emergencias</a>
        <a class="hx-btn hx-btn-ghost" href="#clima"><i class="fas fa-cloud-sun"></i> Clima</a>
      </div>
    </section>

    <section class="hx-section" id="datos">
      <h2><i class="fas fa-circle-info"></i> Datos de ${esc(estado.name)}</h2>
      <div class="hx-facts">
        <div class="hx-fact"><span>Capital</span><strong>${esc(estado.capital)}</strong></div>
        <div class="hx-fact"><span>Superficie</span><strong>${formatNumber(estado.area)} km²</strong></div>
        <div class="hx-fact"><span>Población (Censo 2011)</span><strong>${formatNumber(estado.population)}</strong></div>
        <div class="hx-fact"><span>Densidad</span><strong>${formatNumber(density)} hab/km²</strong></div>
        <div class="hx-fact"><span>Municipios</span><strong>${nMun}</strong></div>
        <div class="hx-fact"><span>Región</span><strong>${esc(estado.region)}</strong></div>
        <div class="hx-fact"><span>Gentilicio</span><strong>${esc(estado.gentilicio)}</strong></div>
        <div class="hx-fact"><span>Código ISO</span><strong>VE-${esc(estado.iso)}</strong></div>
      </div>
    </section>

    <section class="hx-section" id="clima">
      <h2><i class="fas fa-cloud-sun"></i> Clima en ${esc(estado.capital)}</h2>
      <p>${esc(estado.clima)}</p>
      <div class="hx-weather" id="hxWeather" data-lat="${estado.lat}" data-lng="${estado.lng}" data-place="${esc(estado.capital)}">
        <div class="hx-weather-loading"><i class="fas fa-spinner fa-spin"></i> Cargando el clima actual…</div>
      </div>
    </section>

    <section class="hx-section" id="emergencias">
      <h2><i class="fas fa-phone-volume"></i> Números de emergencia en ${esc(estado.name)}</h2>
      <div class="hx-em-national">
        ${EMERGENCIAS_NACIONALES.map(n => `
          <a class="hx-em-card" href="tel:${esc(n.phone.replace(/[^0-9]/g, ''))}">
            <i class="fas ${esc(n.icon)}"></i>
            <strong>${esc(n.display || n.phone)}</strong>
            <span>${esc(n.name)}</span>
          </a>`).join('')}
      </div>
      ${localEmergencies ? `<h3>Servicios locales</h3>${localEmergencies}` : `<p class="hx-note">Aún no tenemos teléfonos locales (policía municipal, bomberos, hospitales) cargados para ${esc(estado.name)}. ¿Conoces alguno? <a href="/contacto.html">Escríbenos</a> y lo agregamos.</p>`}
      <p><a href="/emergencia.html?state=${encodeURIComponent(searchState)}" class="hx-link">Ver directorio de emergencias <i class="fas fa-arrow-right"></i></a></p>
    </section>

    <section class="hx-section" id="tramites">
      <h2><i class="fas fa-landmark"></i> Trámites y organismos</h2>
      <p>Registros y notarías (SAREN), registro civil, tránsito terrestre (INTT) e identificación tienen oficinas en ${esc(estado.name)}. Consulta direcciones, horarios y citas en sus portales oficiales:</p>
      <div class="hx-orgs">
        ${ORGANISMOS.map(o => `
          <a class="hx-org" href="${esc(o.url)}" target="_blank" rel="noopener nofollow">
            <i class="fas ${esc(o.icon)}"></i>
            <div><strong>${esc(o.name)}</strong><span>${esc(o.desc)}</span></div>
          </a>`).join('')}
      </div>
    </section>

    <section class="hx-section" id="municipios">
      <h2><i class="fas fa-map"></i> Municipios de ${esc(estado.name)} (${nMun})</h2>
      <div class="hx-chips">${estado.municipios.map(m => `<span class="hx-chip hx-chip-static">${esc(m)}</span>`).join('')}</div>
    </section>

    <div class="hx-two">
      <section class="hx-section" id="economia">
        <h2><i class="fas fa-chart-line"></i> Economía y rubros</h2>
        <ul class="hx-list">${estado.economia.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </section>
      <section class="hx-section" id="turismo">
        <h2><i class="fas fa-mountain-sun"></i> Qué visitar</h2>
        <ul class="hx-list">${estado.atractivos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </section>
    </div>

    <section class="hx-section" id="medicos">
      <h2><i class="fas fa-user-doctor"></i> Médicos en ${esc(estado.name)}</h2>
      ${espList.length ? `<div class="hx-chips">${espList.map(x =>
        `<a class="hx-chip" href="/medicos/${x.e.slug}/${estado.slug}">${esc(x.e.name)} <b>${x.count}</b></a>`).join('')}</div>` : ''}
      <p><a class="hx-link" href="/search?categoria=medicina-servicio-medico&estado=${encodeURIComponent(searchState)}">Ver todos los médicos y servicios de salud en ${esc(estado.name)} <i class="fas fa-arrow-right"></i></a></p>
    </section>

    <section class="hx-section" id="directorio">
      <h2><i class="fas fa-store"></i> Directorio de negocios en ${esc(estado.name)}</h2>
      ${categories.length ? `<div class="hx-chips">${categories.map(c =>
        `<a class="hx-chip" href="/search?categoria=${encodeURIComponent(c.slug)}&estado=${encodeURIComponent(searchState)}">${esc(c.name)} <b>${c.count}</b></a>`).join('')}</div>` : ''}
      ${cities.length ? `<p class="hx-cities"><i class="fas fa-map-pin"></i> ${cities.map(c => `${esc(c.city)} (${c.count})`).join(' · ')}</p>` : ''}
      ${businesses.length ? `<div class="hx-grid">${businesses.map(b => businessCard(b, b.category_name)).join('')}</div>
        <p class="hx-center"><a class="hx-btn" href="/search?estado=${encodeURIComponent(searchState)}">Ver todos los negocios de ${esc(estado.name)}</a></p>`
        : `<p class="hx-note">Todavía no hay negocios publicados en ${esc(estado.name)}. <a href="/registrar-negocio.html">Registra el tuyo gratis</a>.</p>`}
    </section>

    <section class="hx-section" id="preguntas">
      <h2><i class="fas fa-circle-question"></i> Preguntas frecuentes sobre ${esc(estado.name)}</h2>
      ${faq.map(f => `<details class="hx-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </section>

    <section class="hx-section" id="otros-estados">
      <h2><i class="fas fa-flag"></i> Otros estados de Venezuela</h2>
      <div class="hx-chips">${otherStates}</div>
    </section>

    <p class="hx-sources">Fuentes: Instituto Nacional de Estadística (Censo 2011) y <a href="${esc(wikiUrl)}" target="_blank" rel="noopener">Wikipedia – ${esc(estado.name)}</a> (CC BY-SA). Datos referenciales; la superficie y la población pueden variar según la fuente.</p>
  `;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AdministrativeArea',
      '@id': canonical + '#estado',
      name: estado.name,
      url: canonical,
      description: estado.resena,
      sameAs: wikiUrl,
      geo: { '@type': 'GeoCoordinates', latitude: estado.lat, longitude: estado.lng },
      containedInPlace: { '@type': 'Country', name: 'Venezuela' },
      containsPlace: [
        { '@type': 'City', name: estado.capital, description: 'Capital del estado' },
        ...estado.municipios.map(m => ({ '@type': 'AdministrativeArea', name: 'Municipio ' + m })),
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  if (businesses.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Negocios en ${estado.name}`,
      itemListElement: businesses.slice(0, 20).map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.title, url: BASE_URL + businessPath(b),
      })),
    });
  }

  const html = renderPage({
    title, description, canonical, jsonLd, body,
    breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'Estados', url: '/estados' }, { name: estado.name }],
    extraScripts: '<script src="/js/wiki-weather.js?v=1" defer></script>',
  });
  return htmlResponse(html, canonical);
}

