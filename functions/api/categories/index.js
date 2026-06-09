// functions/api/categories/index.js
// GET: List all active categories

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const categories = await env.DB.prepare(
      'SELECT c.*, (SELECT COUNT(*) FROM businesses b WHERE b.category_id = c.id AND b.status = \'approved\') as business_count FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order ASC, c.name ASC'
    ).all();

    return new Response(JSON.stringify({ categories: categories.results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al obtener categorías', debug: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
