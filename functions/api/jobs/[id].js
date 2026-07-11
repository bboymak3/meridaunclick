// functions/api/jobs/[id].js
// PATCH: approve/reject job | DELETE: delete job | GET: single job

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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

async function requireAuth(request, env) {
  const jwtSecret = env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure';
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, jwtSecret);
  return payload;
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const id = context.params.id;
    const job = await env.DB.prepare(
      `SELECT j.*, b.logo as business_logo, b.title as business_title
       FROM job_listings j
       LEFT JOIN businesses b ON j.business_id = b.id
       WHERE j.id = ?`
    ).bind(id).first();
    if (!job) {
      return new Response(JSON.stringify({ error: 'Empleo no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(job), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPatch(context) {
  try {
    const { env, request } = context;
    const user = await requireAuth(request, env);
    if (!user || (user.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const id = context.params.id;
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      await env.DB.prepare("UPDATE job_listings SET status = 'approved', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ message: 'Oferta aprobada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else if (action === 'reject') {
      await env.DB.prepare("UPDATE job_listings SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ message: 'Oferta rechazada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

export async function onRequestDelete(context) {
  try {
    const { env, request } = context;
    const user = await requireAuth(request, env);
    if (!user || (user.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const id = context.params.id;
    await env.DB.prepare('DELETE FROM job_listings WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ message: 'Oferta eliminada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
