// functions/api/admin/sellers/index.js
// GET: List all seller profiles (admin only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if sellers_profiles table exists
    const tableCheck = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sellers_profiles'").first();
    if (!tableCheck) {
      // Table doesn't exist - return empty array
      return new Response(JSON.stringify({ sellers: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Discover actual columns in sellers_profiles table
    const colRows = await env.DB.prepare("PRAGMA table_info(sellers_profiles)").all();
    const existingCols = (colRows.results || []).map(r => r.name);
    const colSet = new Set(existingCols);

    // Build SELECT clause dynamically using only columns that exist
    const spSelects = [];
    if (colSet.has('user_id')) spSelects.push('sp.user_id');

    // store_name: use if exists, else derive from businesses or users
    if (colSet.has('store_name')) {
      spSelects.push("sp.store_name");
    } else {
      spSelects.push("(SELECT b.title FROM businesses b WHERE b.user_id = sp.user_id LIMIT 1) as store_name");
    }

    if (colSet.has('description')) spSelects.push("sp.description");
    else spSelects.push("'' as description");

    if (colSet.has('avatar')) spSelects.push("sp.avatar");
    else spSelects.push("'' as avatar");

    if (colSet.has('city')) spSelects.push("sp.city");
    else spSelects.push("'' as city");

    if (colSet.has('state')) spSelects.push("sp.state");
    else spSelects.push("'' as state");

    if (colSet.has('phone')) spSelects.push("sp.phone");
    else spSelects.push("'' as phone");

    if (colSet.has('whatsapp')) spSelects.push("sp.whatsapp");
    else spSelects.push("'' as whatsapp");

    if (colSet.has('instagram')) spSelects.push("sp.instagram");
    else spSelects.push("'' as instagram");

    if (colSet.has('facebook')) spSelects.push("sp.facebook");
    else spSelects.push("'' as facebook");

    if (colSet.has('tiktok')) spSelects.push("sp.tiktok");
    else spSelects.push("'' as tiktok");

    if (colSet.has('rating')) spSelects.push("sp.rating");
    else spSelects.push("0 as rating");

    if (colSet.has('total_sales')) spSelects.push("sp.total_sales");
    else spSelects.push("0 as total_sales");

    if (colSet.has('created_at')) spSelects.push("sp.created_at");
    else spSelects.push("'' as created_at");

    if (colSet.has('updated_at')) spSelects.push("sp.updated_at");
    else spSelects.push("'' as updated_at");

    const query = `
      SELECT ${spSelects.join(', ')},
             COALESCE(u.name, 'Sin nombre') as user_name,
             u.email as user_email,
             u.role as user_role,
             COALESCE(u.plan_type, 'basic') as plan_type
      FROM sellers_profiles sp
      LEFT JOIN users u ON sp.user_id = u.id
      ORDER BY sp.created_at DESC
    `;

    const sellers = await env.DB.prepare(query).all();

    return new Response(JSON.stringify({ sellers: sellers.results || [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sellers list error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}