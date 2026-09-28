// functions/api/wiki/[slug].js
// (admin) Editar la wiki sin tocar el codigo:
//   PUT    /api/wiki/:slug   guarda las ediciones de un estado (o "_global")
//   DELETE /api/wiki/:slug   borra las ediciones (vuelve a los datos por defecto)

import { requireAdmin, jsonResponse, errorResponse, corsHeaders } from '../../_lib/auth.js';
import {
  ensureWikiTable, isValidWikiSlug, sanitizeStateOverride, sanitizeGlobalOverride, GLOBAL_SLUG,
} from '../../_lib/wiki-store.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPut({ request, env, params }) {
  const { user, error } = await requireAdmin(request, env);
  if (error) return error;
  if (!env.DB) return errorResponse('Base de datos no disponible', 500);

  const slug = params.slug;
  if (!isValidWikiSlug(slug)) return errorResponse('Estado no válido', 404);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Datos no válidos', 400);
  }

  const data = slug === GLOBAL_SLUG ? sanitizeGlobalOverride(body) : sanitizeStateOverride(body);
  try {
    await ensureWikiTable(env);
    await env.DB.prepare(
      `INSERT INTO wiki_overrides (slug, data, updated_at, updated_by) VALUES (?, ?, datetime('now'), ?)
       ON CONFLICT(slug) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
    ).bind(slug, JSON.stringify(data), user.id || null).run();
  } catch (e) {
    console.error('wiki save error:', e);
    return errorResponse('No se pudo guardar', 500);
  }
  return jsonResponse({ message: 'Guardado', slug, data });
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env);
  if (error) return error;
  if (!env.DB) return errorResponse('Base de datos no disponible', 500);
  if (!isValidWikiSlug(params.slug)) return errorResponse('Estado no válido', 404);
  try {
    await ensureWikiTable(env);
    await env.DB.prepare('DELETE FROM wiki_overrides WHERE slug = ?').bind(params.slug).run();
  } catch (e) {
    return errorResponse('No se pudo restablecer', 500);
  }
  return jsonResponse({ message: 'Restablecido a los datos por defecto', slug: params.slug });
}
