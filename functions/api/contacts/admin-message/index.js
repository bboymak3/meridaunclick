// functions/api/contacts/admin-message/index.js
// POST: Admin sends a message to a user (creates a contact record)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { user_id, subject, message } = body;

    if (!user_id || !subject || !message) {
      return new Response(JSON.stringify({ error: 'user_id, subject y message son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user info for the contact record
    const user = await env.DB.prepare('SELECT name, email, phone FROM users WHERE id = ?').bind(user_id).first();

    await env.DB.prepare(
      'INSERT INTO contacts (business_id, name, email, phone, message, is_read, status) VALUES (?, ?, ?, ?, ?, 0, ?)'
    ).bind(
      null, // no specific business
      `Admin → ${user?.name || 'Usuario'}`,
      user?.email || '',
      user?.phone || '',
      `[${subject}] ${message}`,
      0,
      'nuevo'
    ).run();

    return new Response(JSON.stringify({ message: 'Mensaje enviado correctamente' }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin message error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}