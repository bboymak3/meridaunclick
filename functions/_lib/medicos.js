// functions/_lib/medicos.js
// Paginas de medicos por especialidad:
//   /medicos                         -> indice de especialidades
//   /medicos/:especialidad           -> p. ej. /medicos/cardiologia
//   /medicos/:especialidad/:estado   -> p. ej. /medicos/cardiologia/merida

import { ESPECIALIDADES, findEspecialidad, matchEspecialidades } from '../../js/especialidades.js';
import { ESTADOS, findEstado } from './estados-data.js';
import { BASE_URL, esc, renderPage, htmlResponse, notFound, businessCard, businessPath } from './page-shell.js';

export const MEDICAL_CATEGORY = 'medicina-servicio-medico';

/** Approved medical businesses with their matched specialties and state. */
export async function fetchMedicos(env) {
  if (!env.DB) return [];
  const base = `
    SELECT b.id, b.title, b.slug, b.city, b.state, b.especialidad, b.featured, b.business_type,
           b.updated_at, b.created_at, c.slug as category_slug TIPO_COL,
           (SELECT url FROM images WHERE business_id = b.id ORDER BY is_cover DESC, order_index ASC LIMIT 1) as cover_image
    FROM businesses b
    JOIN categories c ON b.category_id = c.id
    TIPO_JOIN
    WHERE b.status = 'approved' AND c.slug = '${MEDICAL_CATEGORY}' AND b.slug IS NOT NULL AND b.slug != ''
    ORDER BY b.featured DESC, b.created_at DESC`;
  let rows;
  try {
    rows = (await env.DB.prepare(base.replace('TIPO_COL', ', tn.slug as tipo_negocio_slug')
      .replace('TIPO_JOIN', 'LEFT JOIN tipos_negocio tn ON c.tipo_negocio_id = tn.id')).all()).results || [];
  } catch (e) {
    try {
      rows = (await env.DB.prepare(base.replace('TIPO_COL', '').replace('TIPO_JOIN', '')).all()).results || [];
    } catch (e2) {
      rows = [];
    }
  }
  return rows.map(r => ({ ...r, esps: matchEspecialidades(r.especialidad), estado: findEstado(r.state) }));
}

function countBy(list, keyFn) {
  const m = new Map();
  for (const x of list) for (const k of keyFn(x)) m.set(k, (m.get(k) || 0) + 1);
  return m;
}

function doctorsLd(list, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: list.length,
    itemListElement: list.slice(0, 30).map((b, i) => ({
      '@type': 'ListItem', position: i + 1, name: b.title, url: BASE_URL + businessPath(b),
    })),
  };
}

// ─── /medicos ───
export async function renderMedicosIndex(env) {
  const medicos = await fetchMedicos(env);
  const espCount = countBy(medicos, m => m.esps.map(e => e.slug));
  const stateCount = countBy(medicos, m => (m.estado ? [m.estado.slug] : []));
  const canonical = `${BASE_URL}/medicos`;

  const espCards = ESPECIALIDADES.map(e => {
    const n = espCount.get(e.slug) || 0;
    return n
      ? `<a class="hx-esp-card" href="/medicos/${e.slug}"><strong>${esc(e.name)}</strong><span>${n} ${n === 1 ? 'profesional' : 'profesionales'}</span></a>`
      : `<div class="hx-esp-card is-empty"><strong>${esc(e.name)}</strong><span>Próximamente</span></div>`;
  }).join('');

  const stateChips = ESTADOS.filter(s => stateCount.get(s.slug)).map(s =>
    `<a class="hx-chip" href="/search?categoria=${MEDICAL_CATEGORY}&estado=${encodeURIComponent(s.dbNames[0])}">${esc(s.name)} <b>${stateCount.get(s.slug)}</b></a>`
  ).join('');

  const body = `
    <section class="hx-hero">
      <p class="hx-kicker"><i class="fas fa-user-doctor"></i> Directorio médico</p>
      <h1>Médicos en Venezuela por especialidad</h1>
      <h2 class="hx-sub">${medicos.length} médicos y servicios de salud en HolaX</h2>
      <p class="hx-lead">Encuentra al especialista que necesitas cerca de ti: cardiólogos, pediatras, ginecólogos, odontólogos, dermatólogos y más. Cada ficha incluye dirección, horarios, ubicación en el mapa y contacto directo por WhatsApp para agendar tu consulta.</p>
    </section>
    <section class="hx-section">
      <h2><i class="fas fa-stethoscope"></i> Especialidades</h2>
      <div class="hx-esp-grid">${espCards}</div>
    </section>
    ${stateChips ? `<section class="hx-section"><h2><i class="fas fa-map"></i> Médicos por estado</h2><div class="hx-chips">${stateChips}</div></section>` : ''}
    <section class="hx-section hx-cta">
      <h2>¿Eres médico o tienes un consultorio?</h2>
      <p>Publica tu ficha gratis, elige tu especialidad y aparece en estas páginas y en Google.</p>
      <a class="hx-btn" href="/registrar-negocio.html">Registrar mi consultorio</a>
    </section>`;

  return htmlResponse(renderPage({
    title: 'Médicos en Venezuela por especialidad | Directorio HolaX',
    description: `Directorio de médicos en Venezuela por especialidad y estado: ${medicos.length} profesionales con dirección, horarios, mapa y WhatsApp para agendar tu consulta.`.slice(0, 160),
    canonical, body,
    jsonLd: medicos.length ? [doctorsLd(medicos, 'Médicos en Venezuela')] : [],
    breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'Médicos' }],
  }), canonical);
}

// ─── /medicos/:especialidad[/:estado] ───
export async function renderEspecialidad(env, espSlug, estadoSlug) {
  const esp = findEspecialidad(espSlug);
  if (!esp) return notFound('Esa especialidad no existe en nuestro directorio.');

  let estado = null;
  if (estadoSlug) {
    estado = findEstado(decodeURIComponent(estadoSlug));
    if (!estado) return notFound('El estado que buscas no está disponible.');
    if (estado.slug !== estadoSlug) {
      return new Response('', { status: 301, headers: { Location: `/medicos/${esp.slug}/${estado.slug}` } });
    }
  }

  const medicos = await fetchMedicos(env);
  const ofEsp = medicos.filter(m => m.esps.some(e => e.slug === esp.slug));
  const list = estado ? ofEsp.filter(m => m.estado && m.estado.slug === estado.slug) : ofEsp;
  const place = estado ? estado.name : 'Venezuela';
  const n = list.length;
  const Plural = esp.plural.charAt(0).toUpperCase() + esp.plural.slice(1);
  const canonical = `${BASE_URL}/medicos/${esp.slug}${estado ? '/' + estado.slug : ''}`;

  const stateCount = countBy(ofEsp, m => (m.estado ? [m.estado.slug] : []));
  const stateChips = ESTADOS.filter(s => stateCount.get(s.slug)).map(s =>
    `<a class="hx-chip${estado && estado.slug === s.slug ? ' is-active' : ''}" href="/medicos/${esp.slug}/${s.slug}">${esc(s.name)} <b>${stateCount.get(s.slug)}</b></a>`
  ).join('');

  const pool = estado ? medicos.filter(m => m.estado && m.estado.slug === estado.slug) : medicos;
  const otherCount = countBy(pool, m => m.esps.map(e => e.slug));
  const otherChips = ESPECIALIDADES.filter(e => e.slug !== esp.slug && otherCount.get(e.slug)).map(e =>
    `<a class="hx-chip" href="/medicos/${e.slug}${estado ? '/' + estado.slug : ''}">${esc(e.name)} <b>${otherCount.get(e.slug)}</b></a>`
  ).join('');

  const intro = `Encuentra ${esp.plural} en ${place} y agenda tu consulta de ${esp.name.toLowerCase()} de forma rápida. `
    + `En HolaX cada especialista tiene su ficha con dirección del consultorio, horarios, ubicación en el mapa, reseñas de pacientes `
    + `y contacto directo por WhatsApp o teléfono.`;

  const faq = [
    { q: `¿Cómo encuentro ${esp.plural} en ${place}?`, a: `En esta página están los ${esp.plural} de ${place} registrados en HolaX. Abre cada ficha para ver dirección, horarios y ubicación en el mapa.` },
    { q: `¿Cómo agendo una cita con un especialista en ${esp.name.toLowerCase()}?`, a: 'Cada ficha tiene botones de WhatsApp y teléfono para contactar directamente al consultorio y agendar tu consulta.' },
    { q: `¿Soy especialista en ${esp.name.toLowerCase()}, cómo aparezco aquí?`, a: 'Registra tu consultorio gratis en holax.com.ve/registrar-negocio.html, elige la categoría Medicina / Servicio Médico y escribe tu especialidad.' },
  ];

  const body = `
    <section class="hx-hero">
      <p class="hx-kicker"><i class="fas fa-user-doctor"></i> ${esc(esp.name)}${estado ? ' · ' + esc(estado.name) : ''}</p>
      <h1>${esc(Plural)} en ${esc(place)}</h1>
      <h2 class="hx-sub">${n ? `${n} ${n === 1 ? 'especialista disponible' : 'especialistas disponibles'} en ${esc(place)}` : `Directorio de ${esc(esp.plural)} en ${esc(place)}`}</h2>
      <p class="hx-lead">${esc(intro)}</p>
    </section>
    ${stateChips ? `<section class="hx-section"><h2><i class="fas fa-map"></i> ${esc(Plural)} por estado</h2>
      <div class="hx-chips">${estado ? `<a class="hx-chip" href="/medicos/${esp.slug}">Toda Venezuela <b>${ofEsp.length}</b></a>` : ''}${stateChips}</div></section>` : ''}
    <section class="hx-section">
      ${n ? `<div class="hx-grid">${list.map(b => businessCard(b, b.especialidad)).join('')}</div>`
        : `<p class="hx-note">Aún no hay ${esc(esp.plural)} publicados en ${esc(place)}. ${estado ? `<a href="/medicos/${esp.slug}">Ver ${esc(esp.plural)} en toda Venezuela</a> o ` : ''}<a href="/registrar-negocio.html">registra tu consultorio gratis</a>.</p>`}
    </section>
    ${otherChips ? `<section class="hx-section"><h2><i class="fas fa-stethoscope"></i> Otras especialidades${estado ? ' en ' + esc(estado.name) : ''}</h2><div class="hx-chips">${otherChips}</div></section>` : ''}
    <section class="hx-section">
      <h2><i class="fas fa-circle-question"></i> Preguntas frecuentes</h2>
      ${faq.map(f => `<details class="hx-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </section>
    ${estado ? `<p class="hx-center"><a class="hx-link" href="/estado/${estado.slug}">Guía de ${esc(estado.name)}: clima, emergencias y municipios <i class="fas fa-arrow-right"></i></a></p>` : ''}`;

  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }];
  if (n) jsonLd.unshift(doctorsLd(list, `${Plural} en ${place}`));

  const crumbs = [{ name: 'Inicio', url: '/' }, { name: 'Médicos', url: '/medicos' }];
  if (estado) crumbs.push({ name: esp.name, url: `/medicos/${esp.slug}` }, { name: estado.name });
  else crumbs.push({ name: esp.name });

  return htmlResponse(renderPage({
    title: `${Plural} en ${place}${n ? ` (${n})` : ''} | Directorio médico HolaX`,
    description: `${Plural} en ${place}: ${n ? n + ' especialistas con ' : ''}dirección, horarios, mapa, reseñas y WhatsApp para agendar tu consulta de ${esp.name.toLowerCase()}.`.slice(0, 160),
    canonical, body, jsonLd,
    // Empty pages exist for navigation but shouldn't be indexed until they have doctors
    robots: n ? 'index, follow' : 'noindex, follow',
    breadcrumb: crumbs,
  }), canonical);
}
