// functions/api/businesses/index.js
// GET: List businesses (with filters)
// POST: Create business (requires auth)

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

// ─── GET: List businesses ───────────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const businessType = params.get('business_type');
    const categorySlug = params.get('categoria');
    const city = params.get('city');
    const state = params.get('state');
    const status = params.get('status') || 'approved';
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 12;
    const offset = (page - 1) * limit;
    const search = params.get('search');
    const sort = params.get('sort') || 'newest';
    const userId = params.get('user_id');
    const featured = params.get('featured');

    const conditions = [];
    const bindings = [];

    conditions.push('p.status = ?');
    bindings.push(status);

    if (userId) {
      conditions.push('p.user_id = ?');
      bindings.push(parseInt(userId));
    }

    if (businessType) {
      conditions.push('p.business_type = ?');
      bindings.push(businessType);
    }
    if (categorySlug) {
      // Support both slug and numeric id
      if (!isNaN(categorySlug)) {
        conditions.push('p.category_id = ?');
        bindings.push(parseInt(categorySlug));
      } else {
        conditions.push('p.category_id = (SELECT id FROM categories WHERE slug = ?)');
        bindings.push(categorySlug);
      }
    }
    if (state) {
      conditions.push('p.state = ?');
      bindings.push(state);
    }
    if (city) {
      conditions.push('p.city LIKE ?');
      bindings.push(`%${city}%`);
    }
    if (featured === '1') {
      conditions.push('p.featured = 1');
    }
    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Sort options
    let orderBy = 'p.created_at DESC';
    if (sort === 'views_desc') orderBy = 'p.views DESC';
    else if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'oldest') orderBy = 'p.created_at ASC';
    else orderBy = 'p.created_at DESC';

    // Count total matching businesses
    const countQuery = `SELECT COUNT(*) as total FROM businesses p WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();
    const total = countResult.total;

    // Fetch businesses with cover image and owner info
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as owner_name,
        u.phone as owner_phone,
        u.whatsapp as owner_whatsapp,
        u.avatar as owner_avatar,
        (SELECT url FROM images WHERE business_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
        (SELECT COUNT(*) FROM images WHERE business_id = p.id) as image_count
      FROM businesses p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const businesses = await env.DB.prepare(query).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      businesses: businesses.results,
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
    console.error('Businesses GET error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de businesses no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Create business ──────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Check D1 binding
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible. Verifica el binding D1 en Cloudflare Pages.', debug: 'DB binding missing' }), {
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
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Required fields - title is mandatory, category and business_type have defaults
    const { title, category_id, business_type } = body;
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El título es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default business_type to 'negocio' if not provided
    const finalBusinessType = business_type || 'negocio';
    const validBusinessTypes = ['negocio', 'profesional', 'servicio', 'restaurante', 'tienda', 'otro'];
    if (!validBusinessTypes.includes(finalBusinessType)) {
      return new Response(JSON.stringify({ error: 'Tipo de negocio inválido', validTypes: validBusinessTypes, received: finalBusinessType }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default category to 'variedades' if not provided
    const catInput = category_id || 'variedades';

    // Resolve category_id: accept numeric ID or slug string
    let resolvedCategoryId = catInput;
    if (isNaN(parseInt(catInput))) {
      // It's a slug - look up the numeric ID
      const catRow = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(catInput).first();
      if (catRow) {
        resolvedCategoryId = catRow.id;
      } else {
        // Category not in DB - try to create it
        try {
          const slugName = catInput.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const insertResult = await env.DB.prepare(
            'INSERT INTO categories (name, slug, icon, color, sort_order) VALUES (?, ?, ?, ?, 99)'
          ).bind(slugName, catInput, 'fas fa-store', '#607d8b').run();
          resolvedCategoryId = insertResult.meta.last_row_id;
        } catch (insertErr) {
          // If still can't insert, default to first category
          const fallback = await env.DB.prepare('SELECT id FROM categories ORDER BY sort_order LIMIT 1').first();
          resolvedCategoryId = fallback ? fallback.id : 1;
        }
      }
    } else {
      resolvedCategoryId = parseInt(catInput);
    }

    // Generate slug from title
    const slug = title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 120);

    const result = await env.DB.prepare(`
      INSERT INTO businesses (
        user_id, title, slug, description, category_id, business_type,
        address, city, state, country, lat, lng,
        phone, whatsapp, website, instagram, facebook, twitter, tiktok, youtube, email_contact, schedule,
        has_parking, has_wifi, has_card, has_delivery, has_outdoor,
        video_url,
        status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      payload.id,
      title,
      slug,
      body.description || null,
      resolvedCategoryId,
      finalBusinessType,
      body.address || null,
      body.city || 'Mérida',
      body.state || 'Mérida',
      body.country || 'Venezuela',
      body.lat || null,
      body.lng || null,
      body.phone || null,
      body.whatsapp || null,
      body.website || null,
      body.instagram || null,
      body.facebook || null,
      body.twitter || null,
      body.tiktok || null,
      body.youtube || null,
      body.email_contact || null,
      body.schedule || null,
      body.has_parking ? 1 : 0,
      body.has_wifi ? 1 : 0,
      body.has_card ? 1 : 0,
      body.has_delivery ? 1 : 0,
      body.has_outdoor ? 1 : 0,
      body.video_url || null,
      'pending'
    ).run();

    const businessId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Negocio registrado exitosamente. Está pendiente de aprobación.',
      business_id: businessId,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Businesses POST error:', error);
    let errorMsg = 'Error interno del servidor';
    if (error.message && error.message.includes('no such table')) {
      errorMsg = 'Error: La tabla de businesses no existe. Ejecuta el schema.sql en tu D1.';
    } else if (error.message) {
      errorMsg = `Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ error: errorMsg, debug: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
