const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPut(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await env.DB.prepare('UPDATE businesses SET featured = 0 WHERE featured = 1').run();
    return new Response(JSON.stringify({ message: 'Featured cleared' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}