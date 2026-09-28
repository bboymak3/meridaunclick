// functions/api/wiki/index.js
// GET /api/wiki — (admin) datos por defecto + ediciones de todos los estados
// y la configuracion global de la wiki, para el panel admin-wiki.html.

import { requireAdmin, jsonResponse, errorResponse, corsHeaders } from '../../_lib/auth.js';
import { ESTADOS, WIKI_GLOBAL_DEFAULTS } from '../../_lib/estados-data.js';
import { loadAllOverrides, GLOBAL_SLUG } from '../../_lib/wiki-store.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;
  if (!env.DB) return errorResponse('Base de datos no disponible', 500);

  const overrides = await loadAllOverrides(env);
  return jsonResponse({
    global: { defaults: WIKI_GLOBAL_DEFAULTS, override: overrides[GLOBAL_SLUG] || {} },
    estados: ESTADOS.map(e => ({ defaults: e, override: overrides[e.slug] || {} })),
  });
}
