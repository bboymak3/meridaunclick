// functions/api/admin/images/replace.js
// Reemplaza una imagen de R2 por su versión optimizada, en la MISMA ubicación
// (key), así las URLs guardadas en la base de datos no cambian.
//
//   PUT  ?key=...           cuerpo = imagen optimizada (Content-Type image/*)
//   POST ?key=...&mark=1    solo la marca como optimizada (no se pudo reducir)
//
// Antes de reemplazar guarda una copia del original en _originals/<key>
// (una sola vez), para poder restaurarla si hiciera falta.

import { corsHeaders, requireAdmin } from '../../../_lib/auth.js';

const ALLOWED = ['image/webp', 'image/jpeg', 'image/png'];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function validKey(env, key) {
  const folder = (env.R2_FOLDER || 'merida') + '/';
  return !!key && key.startsWith(folder) && !key.includes('..') && !key.startsWith(folder + 'videos/');
}

async function purgeEdgeCache(request, key) {
  try {
    const origin = new URL(request.url).origin;
    const cache = caches.default;
    await Promise.all([
      cache.delete(new Request(origin + '/api/serve?key=' + encodeURIComponent(key))),
      cache.delete(new Request(origin + '/api/serve?key=' + key)),
    ]);
  } catch (e) { /* solo afecta a esta región; el resto expira en 1 día */ }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// Marcar como optimizada sin cambiar el contenido
export async function onRequestPost(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;
    const { env, request } = context;
    const key = new URL(request.url).searchParams.get('key');
    if (!validKey(env, key)) return json({ error: 'Clave no válida' }, 400);
    const obj = await env.R2.get(key);
    if (!obj) return json({ error: 'Imagen no encontrada' }, 404);
    await env.R2.put(key, obj.body, {
      httpMetadata: obj.httpMetadata,
      customMetadata: { ...(obj.customMetadata || {}), optimized: '1' },
    });
    return json({ ok: true, key, marked: true });
  } catch (error) {
    return json({ error: 'Error al marcar la imagen', details: error.message }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;
    const { env, request } = context;
    if (!env.R2) return json({ error: 'R2 no configurado' }, 503);

    const key = new URL(request.url).searchParams.get('key');
    if (!validKey(env, key)) return json({ error: 'Clave no válida' }, 400);

    const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED.includes(type)) return json({ error: 'Formato no permitido' }, 400);

    const body = await request.arrayBuffer();
    if (!body.byteLength) return json({ error: 'Imagen vacía' }, 400);

    const current = await env.R2.get(key);
    if (!current) return json({ error: 'Imagen no encontrada' }, 404);
    if (body.byteLength >= current.size) {
      return json({ error: 'La versión optimizada no es más liviana', current: current.size, new: body.byteLength }, 409);
    }

    // Copia de seguridad del original (solo la primera vez)
    const backupKey = '_originals/' + key;
    const hasBackup = await env.R2.head(backupKey);
    if (!hasBackup) {
      await env.R2.put(backupKey, current.body, {
        httpMetadata: current.httpMetadata,
        customMetadata: current.customMetadata || {},
      });
    }

    const originalSize = (current.customMetadata && current.customMetadata.original_size) || String(current.size);
    await env.R2.put(key, body, {
      httpMetadata: { contentType: type },
      customMetadata: {
        optimized: '1',
        original_size: originalSize,
        original_type: (current.httpMetadata && current.httpMetadata.contentType) || '',
        optimized_at: new Date().toISOString(),
      },
    });
    context.waitUntil(purgeEdgeCache(request, key));

    return json({ ok: true, key, before: current.size, after: body.byteLength });
  } catch (error) {
    return json({ error: 'Error al reemplazar la imagen', details: error.message }, 500);
  }
}
