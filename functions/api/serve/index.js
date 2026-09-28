// functions/api/serve/index.js
// GET: Serve images directly from R2 bucket through our API
// Usage: /api/serve?key=businesses/123/1234_photo.jpg

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;

    if (!env.R2) {
      return new Response('R2 storage not configured', {
        status: 503,
        headers: corsHeaders,
      });
    }

    // Get the key from query parameter
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing file key parameter. Usage: /api/serve?key=path/to/file.jpg' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate key format (prevent path traversal)
    if (key.includes('..') || key.startsWith('/')) {
      return new Response('Invalid key format', {
        status: 400,
        headers: corsHeaders,
      });
    }

    // fresh=1: leer directo de R2 sin caché (herramienta de optimización)
    const fresh = url.searchParams.get('fresh') === '1';

    // Reuse the edge-cached response before reading the object from R2.
    const cache = caches.default;
    if (!fresh) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
    }

    // Fetch the object from R2
    const object = await env.R2.get(key);

    if (!object) {
      return new Response('Image not found', {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Determine content type from metadata or key extension
    const contentType = object.httpMetadata?.contentType || getContentTypeFromKey(key);

    // Navegador: 1 semana. Caché del borde (abajo): 1 día, para que una imagen
    // re-optimizada en R2 se vea en todas las regiones en menos de un día.
    const cacheHeaders = {
      'Cache-Control': fresh ? 'no-store' : 'public, max-age=604800',
      'ETag': object.etag || '',
      'Last-Modified': object.uploaded.toUTCString(),
    };

    const response = new Response(object.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        ...cacheHeaders,
      },
    });

    if (!fresh) {
      const edgeCopy = new Response(response.clone().body, response);
      edgeCopy.headers.set('Cache-Control', 'public, max-age=86400');
      context.waitUntil(cache.put(request, edgeCopy));
    }
    return response;
  } catch (error) {
    console.error('Serve image error:', error);
    return new Response('Error serving image', {
      status: 500,
      headers: corsHeaders,
    });
  }
}

function getContentTypeFromKey(key) {
  const ext = key.split('.').pop().toLowerCase();
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    avif: 'image/avif',
  };
  return types[ext] || 'application/octet-stream';
}
