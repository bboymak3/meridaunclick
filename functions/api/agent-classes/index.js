// functions/api/agent-classes/index.js
// GET: List all classes (admin gets all, agents get active only)
// POST: Create new class (admin only)

import { corsHeaders, requireAuth, requireAdmin } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const isAdmin = auth.user.role === 'admin';

    let query, params;
    if (isAdmin) {
      query = `
        SELECT ac.*,
          (SELECT COUNT(*) FROM class_questions WHERE class_id = ac.id) as question_count,
          (SELECT COUNT(*) FROM user_class_progress WHERE class_id = ac.id AND completed = 1) as completions
        FROM agent_classes ac
        ORDER BY ac.sort_order ASC, ac.id ASC
      `;
      params = [];
    } else {
      query = `
        SELECT ac.id, ac.title, ac.description, ac.content, ac.xp_reward, ac.sort_order,
          (SELECT COUNT(*) FROM class_questions WHERE class_id = ac.id) as question_count,
          COALESCE((SELECT completed FROM user_class_progress WHERE class_id = ac.id AND user_id = ?), 0) as is_completed
        FROM agent_classes ac
        WHERE ac.is_active = 1
        ORDER BY ac.sort_order ASC, ac.id ASC
      `;
      params = [auth.user.id];
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify({ classes: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener clases', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const body = await context.request.json();
    const { title, description, content, xp_reward, sort_order, is_active } = body;

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'El titulo es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO agent_classes (title, description, content, xp_reward, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      title.trim(),
      description || '',
      content || '',
      xp_reward || 10,
      sort_order || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ).run();

    return new Response(JSON.stringify({
      message: 'Clase creada exitosamente',
      class_id: result.meta.last_row_id,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al crear clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
