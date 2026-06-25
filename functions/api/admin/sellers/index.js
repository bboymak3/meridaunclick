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

    const sellers = await env.DB.prepare(`
      SELECT sp.user_id, sp.store_name, sp.description, sp.avatar, sp.city, sp.state,
             sp.phone, sp.whatsapp, sp.instagram, sp.facebook, sp.tiktok,
             sp.rating, sp.total_sales, sp.created_at, sp.updated_at,
             u.name as user_name, u.email as user_email, u.role as user_role, u.plan_type
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