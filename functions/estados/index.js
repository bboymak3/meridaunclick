// functions/estados/index.js
// GET /estados — Wiki de Venezuela: indice de los 24 estados / entidades.

import { ESTADOS, formatNumber } from '../_lib/estados-data.js';
import { BASE_URL, esc, renderPage, htmlResponse } from '../_lib/page-shell.js';

function shortText(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export async function onRequestGet() {
  const canonical = `${BASE_URL}/estados`;
  const totalPop = ESTADOS.reduce((s, e) => s + e.population, 0);
  const totalMun = ESTADOS.reduce((s, e) => s + e.municipios.length, 0);

  const cards = ESTADOS.map(e => `
    <a class="hx-state-card" href="/estado/${e.slug}">
      <div class="hx-state-head">
        <h3>${esc(e.name)}</h3>
        <span class="hx-pill">${esc(e.region)}</span>
      </div>
      <p>${esc(shortText(e.resena, 150))}</p>
      <dl>
        <div><dt>Capital</dt><dd>${esc(e.capital)}</dd></div>
        <div><dt>Población</dt><dd>${formatNumber(e.population)}</dd></div>
        <div><dt>Superficie</dt><dd>${formatNumber(e.area)} km²</dd></div>
        <div><dt>Municipios</dt><dd>${e.municipios.length}</dd></div>
      </dl>
      <span class="hx-link">Ver guía de ${esc(e.name)} <i class="fas fa-arrow-right"></i></span>
    </a>`).join('');

  const rows = ESTADOS.map(e => `
    <tr>
      <td><a href="/estado/${e.slug}">${esc(e.name)}</a></td>
      <td>${esc(e.capital)}</td>
      <td class="num">${formatNumber(e.area)}</td>
      <td class="num">${formatNumber(e.population)}</td>
      <td class="num">${e.municipios.length}</td>
    </tr>`).join('');

  const body = `
    <section class="hx-hero">
      <p class="hx-kicker"><i class="fas fa-book-open"></i> Wiki de Venezuela</p>
      <h1>Estados de Venezuela: capitales, municipios, clima y emergencias</h1>
      <h2 class="hx-sub">23 estados y el Distrito Capital · ${totalMun} municipios · ${formatNumber(totalPop)} habitantes (Censo 2011)</h2>
      <p class="hx-lead">Conoce cada estado de Venezuela: una reseña de su historia y geografía, su capital, superficie, población y municipios, el clima actual, los números de emergencia, su economía y los lugares que vale la pena visitar. Cada guía incluye además el directorio de negocios, médicos y servicios de ese estado en HolaX.</p>
    </section>

    <section class="hx-section">
      <div class="hx-state-grid">${cards}</div>
    </section>

    <section class="hx-section">
      <h2><i class="fas fa-table"></i> Tabla comparativa</h2>
      <div class="hx-table-wrap">
        <table class="hx-table">
          <thead><tr><th>Estado</th><th>Capital</th><th>Superficie (km²)</th><th>Población (2011)</th><th>Municipios</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>

    <p class="hx-sources">Fuentes: Instituto Nacional de Estadística (Censo 2011) y Wikipedia (CC BY-SA). Datos referenciales.</p>
  `;

  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Estados de Venezuela',
    url: canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ESTADOS.length,
      itemListElement: ESTADOS.map((e, i) => ({
        '@type': 'ListItem', position: i + 1, name: e.name, url: `${BASE_URL}/estado/${e.slug}`,
      })),
    },
  }];

  const html = renderPage({
    title: 'Estados de Venezuela: capitales, municipios, clima y emergencias | HolaX',
    description: `Guía de los 24 estados de Venezuela: capital, superficie, población, ${totalMun} municipios, clima, números de emergencia, economía y directorio de negocios.`,
    canonical, jsonLd, body,
    breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'Estados' }],
  });
  return htmlResponse(html, canonical);
}
