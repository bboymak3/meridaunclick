// functions/api/upload.js
// POST: Upload image to R2 bucket

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return JSON.parse(atob(base64));
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigPad = sigBase64.length % 4;
  if (sigPad) sigBase64 += '='.repeat(4 - sigPad);
  const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
  if (!isValid) return null;
  const payload = base64urlDecode(payloadB64);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB (compression applied client-side)
// Images are served through our own /api/serve/ endpoint (no public R2 access needed)
// The key is stored in DB; the serve endpoint reads from R2 binding
const R2_SERVE_BASE = '/api/serve';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!env.R2) {
      return new Response(JSON.stringify({ error: 'Almacenamiento R2 no disponible.', debug: 'R2 binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'aunclick_default_secret_2024';

    // Auth required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, jwtSecret);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const businessId = formData.get('business_id');
    const productType = formData.get('product_type'); // 'marketplace' or 'business'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No se proporcionó ningún archivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!businessId && productType !== 'marketplace') {
      return new Response(JSON.stringify({ error: 'business_id es requerido o product_type debe ser marketplace' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return new Response(JSON.stringify({ error: `Formato de archivo no soportado. Formatos permitidos: ${ALLOWED_EXTENSIONS.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Tipo de contenido no soportado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'El archivo excede el tamaño máximo de 50MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify business exists and user owns it (or is admin) — or allow marketplace/video uploads
    if (productType === 'marketplace' || productType === 'video') {
      // Marketplace uploads - any authenticated user can upload
    } else {
      const business = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(businessId).first();
      if (!business) {
        return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (user.role !== 'admin' && user.id !== business.user_id) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para subir imágenes a este negocio' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    // Generate unique key
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Folder = env.R2_FOLDER || 'merida';
    let key;
    if (productType === 'marketplace') {
      key = `${r2Folder}/marketplace/${user.id}/${timestamp}_${sanitizedName}`;
    } else if (productType === 'video') {
      key = `${r2Folder}/videos/${user.id}/${timestamp}_${sanitizedName}`;
    } else {
      key = `${r2Folder}/businesses/${businessId}/${timestamp}_${sanitizedName}`;
    }

    // Upload to R2
    await env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Use our own serve endpoint URL (works without public R2 access)
    const publicUrl = `${R2_SERVE_BASE}?key=${encodeURIComponent(key)}`;

    return new Response(JSON.stringify({
      message: 'Imagen subida exitosamente',
      url: publicUrl,
      key,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message) errorMsg = `Error: ${error.message}`;
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
