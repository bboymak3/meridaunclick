// functions/api/admin/images/external.js
// Fotos del sitio que NO están en R2 (enlaces externos o imágenes incrustadas
// en base64) y su migración a R2. Solo admin.
//
//   GET                  lista las referencias fuera de R2
//   GET  ?fetch=<url>    descarga una imagen externa (para optimizarla en el navegador)
//   POST (multipart)     table, col, id, old, file -> guarda en R2 y reemplaza
//                        el enlace 'old' por el de R2 en esa fila
//   POST ?action=normalize   corrige enlaces relativos 'api/serve?...' -> '/api/serve?...'

import { corsHeaders, requireAdmin } from '../../../_lib/auth.js';

// Solo tablas/columnas del sitio (la base de datos es compartida con otros proyectos)
const REFS = [
  { table: 'products', id: 'id', col: 'image', label: 'Producto' },
  { table: 'job_listings', id: 'id', col: 'business_logo', label: 'Empleo (logo)' },
  { table: 'job_listings', id: 'id', col: 'images', label: 'Empleo (fotos)' },
  { table: 'video_carousel', id: 'id', col: 'thumbnail_url', label: 'Carrusel de videos (miniatura)' },
  { table: 'business_videos', id: 'id', col: 'thumbnail_url', label: 'Video de negocio (miniatura)' },
  { table: 'businesses', id: 'id', col: 'logo', label: 'Negocio (logo)' },
  { table: 'businesses', id: 'id', col: 'banner', label: 'Negocio (banner)' },
  { table: 'images', id: 'id', col: 'url', label: 'Galería de negocio' },
  { table: 'property_images', id: 'id', col: 'url', label: 'Inmueble' },
  { table: 'users', id: 'id', col: 'avatar', label: 'Usuario (foto)' },
  { table: 'users', id: 'id', col: 'seller_photo', label: 'Vendedor (foto)' },
  { table: 'categories', id: 'id', col: 'banner_url', label: 'Categoría (banner)' },
  { table: 'admin_settings', id: 'key', col: 'value', label: 'Configuración', imageKeysOnly: true },
];
const SETTINGS_IMAGE_KEY = /(image|banner|logo)_url$/;
const MAX_BYTES = 15 * 1024 * 1024;
const REF_RE = /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s"'<>,\]\\]+/gi;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function findRef(table, col) {
  return REFS.find((r) => r.table === table && r.col === col);
}

function isR2(ref) { return /\/api\/serve\?key=/.test(ref); }

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context.request, context.env);
  if (auth.error) return auth.error;
  const { env, request } = context;
  const url = new URL(request.url);

  // ── Proxy: descargar una imagen externa ──
  const target = url.searchParams.get('fetch');
  if (target) {
    let parsed;
    try { parsed = new URL(target); } catch (e) { return json({ error: 'URL no válida' }, 400); }
    if (!/^https?:$/.test(parsed.protocol)) return json({ error: 'URL no válida' }, 400);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(parsed.toString(), { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (HolaX image migration)' } });
      clearTimeout(timer);
      if (!res.ok) return json({ error: 'El sitio externo respondió ' + res.status }, 502);
      const type = (res.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (!type.startsWith('image/')) return json({ error: 'El enlace no es una imagen (' + (type || 'desconocido') + ')' }, 415);
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) return json({ error: 'Imagen demasiado grande' }, 413);
      return new Response(buf, { headers: { ...corsHeaders, 'Content-Type': type, 'Cache-Control': 'no-store' } });
    } catch (e) {
      return json({ error: 'No se pudo descargar la imagen externa: ' + e.message }, 502);
    }
  }

  // ── Listado de referencias fuera de R2 ──
  const items = [];
  const fixes = [];
  for (const ref of REFS) {
    try {
      let sql = `SELECT ${ref.id} AS id, ${ref.col} AS val FROM ${ref.table} WHERE ${ref.col} IS NOT NULL AND (${ref.col} LIKE '%http%' OR ${ref.col} LIKE '%data:image%' OR ${ref.col} LIKE 'api/serve%')`;
      const res = await env.DB.prepare(sql).all();
      for (const row of res.results || []) {
        if (ref.imageKeysOnly && !SETTINGS_IMAGE_KEY.test(String(row.id))) continue;
        const val = String(row.val || '');
        if (/^api\/serve\?key=/.test(val)) {
          fixes.push({ table: ref.table, col: ref.col, id: row.id, label: ref.label, value: val });
          continue;
        }
        const found = val.match(REF_RE) || [];
        for (const r of found) {
          if (isR2(r)) continue;
          items.push({
            table: ref.table, col: ref.col, id: row.id, label: ref.label,
            kind: r.startsWith('data:') ? 'base64' : 'external',
            ref: r,
            preview: r.startsWith('data:') ? r.slice(0, 40) + '…' : r,
            bytes: r.startsWith('data:') ? Math.round(r.length * 0.75) : null,
          });
        }
      }
    } catch (e) { /* tabla inexistente en esta instalación */ }
  }
  return json({ items, fixes });
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;
    const { env, request } = context;
    const url = new URL(request.url);

    // ── Corregir enlaces relativos 'api/serve?...' ──
    if (url.searchParams.get('action') === 'normalize') {
      let fixed = 0;
      for (const ref of REFS) {
        try {
          const r = await env.DB.prepare(
            `UPDATE ${ref.table} SET ${ref.col} = '/' || ${ref.col} WHERE ${ref.col} LIKE 'api/serve?key=%'`
          ).run();
          fixed += (r.meta && r.meta.changes) || 0;
        } catch (e) {}
      }
      return json({ ok: true, fixed });
    }

    // ── Migrar una imagen a R2 ──
    if (!env.R2) return json({ error: 'R2 no configurado' }, 503);
    const form = await request.formData();
    const table = String(form.get('table') || '');
    const col = String(form.get('col') || '');
    const id = String(form.get('id') || '');
    const old = String(form.get('old') || '');
    const file = form.get('file');
    const ref = findRef(table, col);
    if (!ref || !id || !old || !file || typeof file === 'string') return json({ error: 'Datos incompletos' }, 400);
    const type = String(file.type || '').toLowerCase();
    if (!['image/webp', 'image/jpeg', 'image/png', 'image/gif'].includes(type)) return json({ error: 'Formato no permitido' }, 400);
    if (file.size > MAX_BYTES) return json({ error: 'Imagen demasiado grande' }, 413);

    const row = await env.DB.prepare(`SELECT ${ref.col} AS val FROM ${ref.table} WHERE ${ref.id} = ?`).bind(id).first();
    if (!row || String(row.val || '').indexOf(old) === -1) return json({ error: 'La referencia ya no existe o cambió' }, 409);

    const ext = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : type === 'image/gif' ? 'gif' : 'jpg';
    const folder = env.R2_FOLDER || 'merida';
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const key = `${folder}/migrated/${ref.table}/${safeId}_${Date.now()}.${ext}`;
    await env.R2.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type },
      customMetadata: { optimized: '1', migrated_from: old.startsWith('data:') ? 'base64' : old.slice(0, 500) },
    });
    const newUrl = '/api/serve?key=' + encodeURIComponent(key);
    await env.DB.prepare(`UPDATE ${ref.table} SET ${ref.col} = REPLACE(${ref.col}, ?, ?) WHERE ${ref.id} = ?`).bind(old, newUrl, id).run();

    return json({ ok: true, url: newUrl, key });
  } catch (error) {
    return json({ error: 'Error al migrar la imagen', details: error.message }, 500);
  }
}
