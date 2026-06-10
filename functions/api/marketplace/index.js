// functions/api/marketplace/index.js
// GET: List all products (no auth needed). Check marketplace_enabled in admin_settings.
// POST: Create product (auth required). Check marketplace_enabled in admin_settings.

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
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
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

async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, env.JWT_SECRET);
}

// ─── GET: List all products ─────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if marketplace is enabled
    try {
      const setting = await env.DB.prepare('SELECT value FROM admin_settings WHERE key = ?').bind('marketplace_enabled').first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'El marketplace está desactivado por el administrador', products: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // admin_settings table may not exist yet — allow listing
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const category = params.get('category');
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const search = params.get('search');
    const sort = params.get('sort') || 'newest';
    const allProducts = params.get('all') === 'true'; // Admin mode: show all statuses
    const statusFilter = params.get('status');

    const conditions = [];
    const bindings = [];

    // Only show approved products to public (unless admin mode)
    if (!allProducts) {
      conditions.push("(status = 'approved' OR status IS NULL)");
    } else if (statusFilter) {
      conditions.push('status = ?');
      bindings.push(statusFilter);
    }

    if (category) {
      conditions.push('category = ?');
      bindings.push(category);
    }

    if (search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Sort options
    let orderBy = 'sort_order ASC, created_at DESC';
    if (sort === 'price_asc') orderBy = 'price ASC';
    else if (sort === 'price_desc') orderBy = 'price DESC';
    else if (sort === 'oldest') orderBy = 'created_at ASC';
    else if (sort === 'name_asc') orderBy = 'name ASC';
    else orderBy = 'sort_order ASC, created_at DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch products
    const query = `SELECT * FROM products ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const products = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      products: products.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Marketplace GET error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create product ────────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if marketplace is enabled
    try {
      const setting = await env.DB.prepare('SELECT value FROM admin_settings WHERE key = ?').bind('marketplace_enabled').first();
      if (setting && setting.value === '0') {
        return new Response(JSON.stringify({ error: 'El marketplace está desactivado por el administrador' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // admin_settings table may not exist yet — allow creation
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre del producto es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.price === undefined || body.price === null) {
      return new Response(JSON.stringify({ error: 'El precio del producto es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default category to 'general' if not provided
    const category = body.category || 'general';
    const validCategories = ['general', 'vehiculos', 'inmuebles', 'electronica', 'servicios', 'ropa', 'hogar'];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: 'Categoría inválida', validCategories }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const businessId = body.business_id ? parseInt(body.business_id) : null;

    const result = await env.DB.prepare(`
      INSERT INTO products (name, price, category, image, description, sort_order, user_id, business_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      body.name.trim(),
      parseInt(body.price),
      category,
      body.image || '',
      body.description || '',
      body.sort_order !== undefined ? parseInt(body.sort_order) : 0,
      user.id,
      businessId
    ).run();

    const productId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Producto creado exitosamente',
      product_id: productId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Marketplace POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de productos no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
