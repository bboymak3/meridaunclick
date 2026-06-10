// functions/api/debug/index.js
// GET: Diagnóstico completo del sistema (solo admin)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequestGet(context) {
  const { env, request } = context;
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
    tables: {},
    api_endpoints: {},
  };

  // Check DB binding
  if (!env.DB) {
    results.checks.database = 'ERROR: DB binding not found';
    results.errors.push('No hay binding de D1. Verifica wrangler.toml o configuracion de Pages.');
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  results.checks.database = 'OK - DB binding found';

  // Check JWT_SECRET
  results.checks.jwt_secret = env.JWT_SECRET ? 'OK' : 'WARNING: JWT_SECRET not set';

  // Test tables
  const tableNames = ['users', 'businesses', 'products', 'categories', 'images', 'contacts', 'favorites', 'states', 'reviews', 'coupons', 'events', 'bookings', 'notifications', 'settings', 'admin_settings'];

  for (const table of tableNames) {
    try {
      const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM ${table}`).first();
      results.tables[table] = { status: 'OK', count: count.c };
    } catch (e) {
      results.tables[table] = { status: 'NOT FOUND', error: e.message };
    }
  }

  // Test product statuses
  try {
    const byStatus = await env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM products GROUP BY status
    `).all();
    results.tables.products_by_status = byStatus.results.map(r => ({ status: r.status, count: r.c }));
  } catch (e) {
    results.tables.products_by_status = { error: e.message };
  }

  // Test business statuses
  try {
    const byStatus = await env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM businesses GROUP BY status
    `).all();
    results.tables.businesses_by_status = byStatus.results.map(r => ({ status: r.status, count: r.c }));
  } catch (e) {
    results.tables.businesses_by_status = { error: e.message };
  }

  // Test admin_settings
  try {
    const settings = await env.DB.prepare(`SELECT key, value FROM admin_settings`).all();
    results.tables.admin_settings_values = settings.results;
  } catch (e) {
    results.tables.admin_settings_values = { error: e.message };
  }

  // Test products schema
  try {
    const schema = await env.DB.prepare(`PRAGMA table_info(products)`).all();
    results.tables.products_schema = schema.results.map(c => c.name);
  } catch (e) {
    results.tables.products_schema = { error: e.message };
  }

  // Test auth (optional)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const user = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
      results.auth = user ? { status: 'OK', user_id: user.id, email: user.email, role: user.role } : { status: 'INVALID TOKEN' };
    } catch (e) {
      results.auth = { status: 'ERROR', error: e.message };
    }
  } else {
    results.auth = { status: 'NO TOKEN PROVIDED (debug endpoint works without auth)' };
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
