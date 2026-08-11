// functions/api/agent-exam/questions.js
// GET: Get 10 random exam questions (without correct answers)

import { corsHeaders, requireAuth } from '../../_lib/auth.js';

function calcLevel(xp) {
  const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;

    // Get profile
    let profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
      profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    }

    // Check prerequisites
    const level = calcLevel(profile.xp);
    if (level < 10) {
      return new Response(JSON.stringify({ error: 'Necesitas nivel 10 para ver las preguntas del examen', required_level: 10, current_level: level }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.exam_passed === 1) {
      return new Response(JSON.stringify({ error: 'Ya aprobaste el examen', exam_passed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all questions
    const { results: allQuestions } = await env.DB.prepare(`
      SELECT cq.id, cq.question, cq.option_a, cq.option_b, cq.option_c, cq.option_d, ac.title as class_name
      FROM class_questions cq
      JOIN agent_classes ac ON ac.id = cq.class_id
      WHERE ac.is_active = 1
    `).bind().all();

    if (allQuestions.length < 10) {
      return new Response(JSON.stringify({ error: 'No hay suficientes preguntas (mínimo 10 requeridas)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Shuffle and pick 10 (Fisher-Yates)
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return new Response(JSON.stringify({
      questions: shuffled.slice(0, 10),
      total_available: allQuestions.length,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener preguntas', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
