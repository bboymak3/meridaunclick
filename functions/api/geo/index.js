// functions/api/geo/index.js
// GET /api/geo — estado de Venezuela desde el que se conecta el visitante,
// segun la geolocalizacion por IP de Cloudflare (request.cf). No usa GPS ni
// guarda nada; el navegador lo usa para preseleccionar el estado.

import { findEstado } from '../../_lib/estados-data.js';

export async function onRequestGet({ request }) {
  const cf = request.cf || {};
  const country = cf.country || '';
  let estado = null;
  if (country === 'VE') {
    estado = findEstado(cf.regionCode) || findEstado(cf.region);
  }
  return new Response(JSON.stringify({
    country,
    region: cf.region || '',
    city: cf.city || '',
    state: estado ? { name: estado.dbNames[0], label: estado.name, slug: estado.slug } : null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });
}
