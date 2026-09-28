// functions/api/medicos/especialidades.js
// GET /api/medicos/especialidades?estado=Barinas
// Especialidades con medicos publicados (en todo el pais o en un estado).
// Lo usa la landing medica de search.html al cambiar de estado.

import { especialidadesConMedicos } from '../../_lib/medicos.js';

export async function onRequestGet({ request, env }) {
  const estadoParam = new URL(request.url).searchParams.get('estado') || '';
  const { estado, total, especialidades } = await especialidadesConMedicos(env, estadoParam);
  return new Response(JSON.stringify({
    estado: estado ? { slug: estado.slug, name: estado.name } : null,
    total,
    especialidades,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}
