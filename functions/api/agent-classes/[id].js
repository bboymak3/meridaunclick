// functions/api/agent-classes/[id].js
// GET: Single class with questions
// PUT: Update class (admin only)
// DELETE: Delete class (admin only)

import { corsHeaders, requireAuth, requireAdmin } from '../../_lib/auth.js';
import { ensureAcademyVideoSchema, youtubeId, normalizeQuestions, replaceQuestions } from '../../_lib/academy-video.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const classId = params.id;

    const cls = await env.DB.prepare('SELECT * FROM agent_classes WHERE id = ?').bind(classId).first();
    if (!cls) {
      return new Response(JSON.stringify({ error: 'Clase no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = auth.user.role === 'admin';
    let query;
    if (isAdmin) {
      query = 'SELECT * FROM class_questions WHERE class_id = ? ORDER BY sort_order ASC, id ASC';
    } else {
      query = 'SELECT id, question, option_a, option_b, option_c, option_d, sort_order FROM class_questions WHERE class_id = ? ORDER BY sort_order ASC, id ASC';
    }
    const { results: questions } = await env.DB.prepare(query).bind(classId).all();

    return new Response(JSON.stringify({ class: cls, questions }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPut(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const classId = params.id;
    const body = await context.request.json();
    const { title, description, content, xp_reward, sort_order, is_active, module, module_order } = body;

    await ensureAcademyVideoSchema(env.DB);
    const existing = await env.DB.prepare('SELECT id, video_url FROM agent_classes WHERE id = ?').bind(classId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Clase no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clase con video de YouTube: URL valida + 5 preguntas
    const videoUrl = body.video_url !== undefined ? String(body.video_url || '').trim() : (existing.video_url || '');
    if (videoUrl && !youtubeId(videoUrl)) {
      return new Response(JSON.stringify({ error: 'La URL del video de YouTube no es valida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let questions = null;
    if (body.questions !== undefined) {
      const norm = normalizeQuestions(body.questions, !!videoUrl);
      if (norm.error) {
        return new Response(JSON.stringify({ error: norm.error }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      questions = norm.questions;
    }

    await env.DB.prepare(`
      UPDATE agent_classes SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        content = COALESCE(?, content),
        xp_reward = COALESCE(?, xp_reward),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        module = COALESCE(?, module),
        module_order = COALESCE(?, module_order),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      title ? title.trim() : null,
      description || null,
      content !== undefined ? content : null,
      xp_reward !== undefined ? xp_reward : null,
      sort_order !== undefined ? sort_order : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      module || null,
      module_order !== undefined ? module_order : null,
      classId
    ).run();

    if (body.video_url !== undefined) {
      await env.DB.prepare('UPDATE agent_classes SET video_url = ? WHERE id = ?').bind(videoUrl, classId).run();
    }
    if (body.teacher !== undefined) {
      await env.DB.prepare('UPDATE agent_classes SET teacher = ? WHERE id = ?').bind(String(body.teacher || '').trim().slice(0, 100), classId).run();
    }
    if (questions) await replaceQuestions(env.DB, classId, questions);

    return new Response(JSON.stringify({ message: 'Clase actualizada exitosamente' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al actualizar clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    const { env, params } = context;
    const classId = params.id;

    await env.DB.batch([
      env.DB.prepare('DELETE FROM class_questions WHERE class_id = ?').bind(classId),
      env.DB.prepare('DELETE FROM user_class_progress WHERE class_id = ?').bind(classId),
      env.DB.prepare('DELETE FROM agent_classes WHERE id = ?').bind(classId),
    ]);

    return new Response(JSON.stringify({ message: 'Clase eliminada exitosamente' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al eliminar clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
