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
      // Table doesn't exist - return empty array instead of 500
      return new Response(JSON.stringify({ sellers: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safe query: use COALESCE in case columns don't exist
    const sellers = await env.DB.prepare(`
      SELECT sp.user_id,
             COALESCE(sp.store_name, (SELECT b.title FROM businesses b WHERE b.user_id = sp.user_id LIMIT 1), u.name, 'Sin nombre') as store_name,
             COALESCE(sp.description, '') as description,
             COALESCE(sp.avatar, '') as avatar,
             COALESCE(sp.city, '') as city,
             COALESCE(sp.state, '') as state,
             COALESCE(sp.phone, '') as phone,
             COALESCE(sp.whatsapp, '') as whatsapp,
             COALESCE(sp.instagram, '') as instagram,
             COALESCE(sp.facebook, '') as facebook,
             COALESCE(sp.tiktok, '') as tiktok,
             COALESCE(sp.rating, 0) as rating,
             COALESCE(sp.total_sales, 0) as total_sales,
             sp.created_at, sp.updated_at,
             u.name as user_name, u.email as user_email, u.role as user_role,
             COALESCE(u.plan_type, 'basic') as plan_type
      FROM sellers_profiles sp
      LEFT JOIN users u ON sp.user_id = u.id
      ORDER BY sp.created_at DESC
    `).all();

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