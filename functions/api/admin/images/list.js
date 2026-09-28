// functions/api/admin/images/list.js
// GET (admin): lista las imágenes guardadas en R2 (carpeta del sitio) con su
// tamaño y si ya fueron optimizadas. Paginado con ?cursor=.
// No incluye videos ni las copias de seguridad (_originals/).

import { corsHeaders, requireAdmin } from '../../../_lib/auth.js';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;
    const { env, request } = context;
    if (!env.R2) return json({ error: 'R2 no configurado' }, 503);

    const url = new URL(request.url);
    const folder = (env.R2_FOLDER || 'merida') + '/';
    const cursor = url.searchParams.get('cursor') || undefined;

    const res = await env.R2.list({ prefix: folder, cursor, limit: 500, include: ['httpMetadata', 'customMetadata'] });
    const items = [];
    for (const obj of res.objects) {
      const key = obj.key;
      if (key.startsWith(folder + 'videos/')) continue;
      const type = (obj.httpMetadata && obj.httpMetadata.contentType) || '';
      if (type && !type.startsWith('image/')) continue;
      if (!type && !IMAGE_EXT.test(key)) continue;
      items.push({
        key,
        size: obj.size,
        type,
        uploaded: obj.uploaded,
        optimized: !!(obj.customMetadata && obj.customMetadata.optimized === '1'),
        original_size: obj.customMetadata && obj.customMetadata.original_size ? Number(obj.customMetadata.original_size) : null,
      });
    }
    return json({ items, cursor: res.truncated ? res.cursor : null, truncated: !!res.truncated });
  } catch (error) {
    return json({ error: 'Error al listar imágenes', details: error.message }, 500);
  }
}
